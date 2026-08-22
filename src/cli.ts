import { ConfigError } from "./config.js";
import { canonicalJson } from "./canonical-json.js";
import { contextFromCwd, lint } from "./lint.js";
import { RealFs, type WriteReader } from "./fs-types.js";
import { exitCodeFor, renderJson, renderText } from "./report.js";
import { runSync } from "./sync.js";
import { runDoctor } from "./wiring.js";
import { VERSION } from "./version.js";

export async function runCli(argv: string[]): Promise<number> {
  const cmd = argv[0];
  if (cmd === "--version" || cmd === "-v") {
    process.stdout.write(VERSION + "\n");
    return 0;
  }
  if (cmd === undefined || cmd === "--help" || cmd === "-h") {
    process.stdout.write("agentsmd — lint | doctor | sync | score\n");
    return 0;
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
  process.stderr.write(`unknown command: ${cmd}\n`);
  return 2;
}

function syncCommand(args: string[]): number {
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
