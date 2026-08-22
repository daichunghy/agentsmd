import { ConfigError } from "./config.js";
import { canonicalJson } from "./canonical-json.js";
import { findRepoRoot } from "./discovery.js";
import { contextFromCwd, lint } from "./lint.js";
import { RealFs, type WriteReader } from "./fs-types.js";
import { runInit } from "./init.js";
import { exitCodeFor, renderJson, renderText } from "./report.js";
import { computeScore, renderScoreText } from "./score.js";
import { runSync } from "./sync.js";
import { runDoctor } from "./wiring.js";
import { VERSION } from "./version.js";

const ROOT_HELP = `\
agentsmd — one source of truth for AI agent instructions

Usage:
  agentsmd <command> [options]
  agentsmd --version
  agentsmd --help

Commands:
  init     Create a starter AGENTS.md (and optional config)
  doctor   Verify which AI tools load your AGENTS.md
  lint     Find instruction rot (dead paths, sprawl, budgets, …)
  sync     Wire Claude Code and Gemini CLI to AGENTS.md
  score    Score instruction health 0–100

Flags:
  --json            Canonical JSON output (init, doctor, lint, score)
  --adopt           Wrap existing CLAUDE.md without deleting content (sync)
  --copilot-copy    Also write a managed Copilot Chat copy (sync)
  --force           Overwrite files that init would otherwise skip
  --config          Write agentsmd.config.json (init)
  -h, --help        Show help
  -v, --version     Print version

Examples:
  npx agentsmd doctor
  npx agentsmd init --config
  npx agentsmd lint --json
  npx agentsmd sync --adopt
  npx agentsmd score --json

Exit codes:
  0  success / clean
  1  findings at or above fail-on (lint, doctor)
  2  usage or configuration error
`;

const INIT_HELP = `\
Usage: agentsmd init [--json] [--config] [--force]

Create a short starter AGENTS.md when the root file is missing.
Never writes CLAUDE.md, GEMINI.md, or Copilot instruction files
(use agentsmd sync for wiring).

Options:
  --config   Write agentsmd.config.json when missing
  --force    Overwrite AGENTS.md and/or config with the starter
  --json     Canonical JSON: { "skipped": [...], "wrote": [...] }
  -h, --help Show this help
`;

const LINT_HELP = `\
Usage: agentsmd lint [--json]

Find instruction rot: dead paths, dead commands, sprawl, budgets, hygiene.

Options:
  --json     Canonical JSON findings
  -h, --help Show this help

Exit 0 when clean; 1 when findings meet fail-on (default: error);
2 when not in a git repository or config is invalid.
`;

const DOCTOR_HELP = `\
Usage: agentsmd doctor [--json]

Verify that each detected agent tool loads AGENTS.md.

Options:
  --json     Canonical JSON (findings + summary)
  -h, --help Show this help

Exit 0 when clean; 1 when findings meet fail-on (default: error);
2 when not in a git repository or config is invalid.

Example:
  npx agentsmd doctor
`;

const SYNC_HELP = `\
Usage: agentsmd sync [--adopt] [--copilot-copy]

Write the minimal wiring artifacts. Never modifies AGENTS.md.
Idempotent: a second run changes nothing.

Options:
  --adopt         Wrap an existing unmanaged CLAUDE.md
  --copilot-copy  Write a managed .github/copilot-instructions.md
  -h, --help      Show this help
`;

const SCORE_HELP = `\
Usage: agentsmd score [--json]

Score instruction health 0–100 (coverage, freshness, wiring, size).

Options:
  --json     Canonical JSON matching schemas/score-report.schema.json
  -h, --help Show this help
`;

export async function runCli(argv: string[]): Promise<number> {
  const cmd = argv[0];
  if (cmd === "--version" || cmd === "-v") {
    process.stdout.write(VERSION + "\n");
    return 0;
  }
  if (cmd === undefined || cmd === "--help" || cmd === "-h") {
    process.stdout.write(ROOT_HELP);
    return 0;
  }
  if (cmd === "init") {
    return initCommand(argv.slice(1));
  }
  if (cmd === "lint") {
    return lintCommand(argv.slice(1));
  }
  if (cmd === "doctor") {
    return doctorCommand(argv.slice(1));
  }
  if (cmd === "sync") {
    return syncCommand(argv.slice(1));
  }
  if (cmd === "score") {
    return scoreCommand(argv.slice(1));
  }
  process.stderr.write(`unknown command: ${cmd}\n`);
  return 2;
}

function wantsHelp(args: string[]): boolean {
  return args.includes("--help") || args.includes("-h");
}

function initCommand(args: string[]): number {
  if (wantsHelp(args)) {
    process.stdout.write(INIT_HELP);
    return 0;
  }
  const json = args.includes("--json");
  const config = args.includes("--config");
  const force = args.includes("--force");
  const fs = new RealFs();
  const root = findRepoRoot(fs, process.cwd());
  if (root === undefined) {
    process.stderr.write("not inside a git repository\n");
    return 2;
  }
  const result = runInit(fs, root, { config, force });
  if (json) {
    process.stdout.write(canonicalJson(result) + "\n");
  } else {
    for (const rel of result.wrote) process.stdout.write(`wrote ${rel}\n`);
    for (const rel of result.skipped) {
      process.stdout.write(`${rel} already exists\n`);
    }
  }
  return 0;
}

function scoreCommand(args: string[]): number {
  if (wantsHelp(args)) {
    process.stdout.write(SCORE_HELP);
    return 0;
  }
  const json = args.includes("--json");
  let ctxOrErr;
  try {
    ctxOrErr = contextFromCwd(new RealFs(), process.cwd());
  } catch (e) {
    if (e instanceof ConfigError) {
      process.stderr.write(`config error: ${e.message}\n`);
      return 2;
    }
    throw e;
  }
  if ("error" in ctxOrErr) {
    process.stderr.write(ctxOrErr.error + "\n");
    return 2;
  }
  const { ctx } = ctxOrErr;
  const report = computeScore(ctx, lint(ctx));
  process.stdout.write(
    json ? canonicalJson(report) + "\n" : renderScoreText(report),
  );
  return 0;
}

function syncCommand(args: string[]): number {
  if (wantsHelp(args)) {
    process.stdout.write(SYNC_HELP);
    return 0;
  }
  const adopt = args.includes("--adopt");
  const copilotCopy = args.includes("--copilot-copy");
  let ctxOrErr;
  try {
    ctxOrErr = contextFromCwd(new RealFs(), process.cwd());
  } catch (e) {
    if (e instanceof ConfigError) {
      process.stderr.write(`config error: ${e.message}\n`);
      return 2;
    }
    throw e;
  }
  if ("error" in ctxOrErr) {
    process.stderr.write(ctxOrErr.error + "\n");
    return 2;
  }
  const { ctx } = ctxOrErr;
  const changed = runSync(ctx.fs as WriteReader, ctx.inv, { adopt, copilotCopy });
  if (changed.length === 0) {
    process.stdout.write("agentsmd: nothing to change\n");
  } else {
    for (const rel of changed) process.stdout.write(`wrote ${rel}\n`);
  }
  return 0;
}

function doctorCommand(args: string[]): number {
  if (wantsHelp(args)) {
    process.stdout.write(DOCTOR_HELP);
    return 0;
  }
  const json = args.includes("--json");
  let ctxOrErr;
  try {
    ctxOrErr = contextFromCwd(new RealFs(), process.cwd());
  } catch (e) {
    if (e instanceof ConfigError) {
      process.stderr.write(`config error: ${e.message}\n`);
      return 2;
    }
    throw e;
  }
  if ("error" in ctxOrErr) {
    process.stderr.write(ctxOrErr.error + "\n");
    return 2;
  }
  const result = runDoctor(ctxOrErr.ctx);
  const out = json
    ? canonicalJson({ findings: result.findings, summary: result.summary }) + "\n"
    : result.summary + "\n" + renderText(result.findings);
  process.stdout.write(out);
  return exitCodeFor(result.findings, ctxOrErr.ctx.inv.config.failOn);
}

function lintCommand(args: string[]): number {
  if (wantsHelp(args)) {
    process.stdout.write(LINT_HELP);
    return 0;
  }
  const json = args.includes("--json");
  let ctxOrErr;
  try {
    ctxOrErr = contextFromCwd(new RealFs(), process.cwd());
  } catch (e) {
    if (e instanceof ConfigError) {
      process.stderr.write(`config error: ${e.message}\n`);
      return 2;
    }
    throw e;
  }
  if ("error" in ctxOrErr) {
    process.stderr.write(ctxOrErr.error + "\n");
    return 2;
  }
  const findings = lint(ctxOrErr.ctx);
  const out = json ? renderJson(findings) : renderText(findings);
  process.stdout.write(out);
  return exitCodeFor(findings, ctxOrErr.ctx.inv.config.failOn);
}
