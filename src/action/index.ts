import * as core from "@actions/core";
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { canonicalJson } from "../canonical-json.js";
import { ConfigError } from "../config.js";
import { contextFromCwd, lint } from "../lint.js";
import type { Finding } from "../rules/types.js";
import { computeScore, type ScoreReport } from "../score.js";
import { RealFs } from "../fs-types.js";

/** One GitHub workflow command annotation per finding. */
export function formatAnnotation(f: Finding): string {
  const msg = `agentsmd ${f.ruleId}: ${f.message}`.replace(/\n/g, " ");
  return `::${f.severity} file=${f.file},line=${f.line}::${msg}`;
}

export interface ActionResult {
  findings: Finding[];
  score: ScoreReport;
  fail: boolean;
  annotations: string[];
}

/** Pure evaluation used by tests; the action entry wraps it with IO. */
export function actionEvaluate(
  workspace: string,
  failOn: "error" | "warning" | "never",
  configPath?: string,
): ActionResult | { error: string } {
  let ctxOrErr;
  try {
    ctxOrErr = contextFromCwd(new RealFs(), workspace, configPath);
  } catch (e) {
    if (e instanceof ConfigError) return { error: e.message };
    throw e;
  }
  if ("error" in ctxOrErr) return { error: ctxOrErr.error };
  const { ctx } = ctxOrErr;
  const findings = lint(ctx);
  const score = computeScore(ctx, findings);
  const annotations = findings.map(formatAnnotation);
  const fail =
    failOn === "warning"
      ? findings.length > 0
      : failOn === "error"
        ? findings.some((f) => f.severity === "error")
        : false;
  return { findings, score, fail, annotations };
}

function git(cmd: string): void {
  execSync(`git ${cmd}`, { stdio: "inherit" });
}

function main(): void {
  const failOnRaw = core.getInput("fail-on") || "error";
  if (failOnRaw !== "error" && failOnRaw !== "warning" && failOnRaw !== "never") {
    core.setFailed(`invalid fail-on value: ${failOnRaw}`);
    return;
  }
  const badgeWrite = core.getInput("badge-write") === "true";
  const configPath = core.getInput("config") || undefined;
  const workspace = process.env.GITHUB_WORKSPACE ?? process.cwd();
  const result = actionEvaluate(workspace, failOnRaw, configPath);
  if ("error" in result) {
    core.setFailed(result.error);
    return;
  }
  for (const a of result.annotations) {
    process.stdout.write(a + "\n");
  }
  mkdirSync("agentsmd-out", { recursive: true });
  const reportJson = canonicalJson(result.score) + "\n";
  writeFileSync("agentsmd-out/score.json", reportJson);
  core.setOutput("score", String(result.score.score));
  core.setOutput("report", "agentsmd-out/score.json");

  if (badgeWrite) {
    const ref = process.env.GITHUB_REF ?? "";
    if (ref.endsWith("/main") || ref.endsWith("/master")) {
      try {
        git(`config user.name agentsmd-bot`);
        git(`config user.email agentsmd@users.noreply.github.com`);
        git(`checkout --orphan gh-pages`);
        git(`rm -rf --quiet .`);
        writeFileSync("score.json", reportJson);
        git(`add score.json`);
        git(`commit -m "agentsmd: update score badge data"`);
        git(`push origin gh-pages --force`);
      } catch (e) {
        core.warning(`badge-write failed: ${String(e)}`);
      }
    } else {
      core.info("badge-write skipped: not on the default branch");
    }
  }

  if (result.fail) {
    core.setFailed(
      `agentsmd found ${result.findings.length} finding(s) at fail-on=${failOnRaw}`,
    );
  }
}

main();
