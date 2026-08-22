import { codexChain } from "./targets/codex.js";
import { claudeState } from "./targets/claude.js";
import { geminiState } from "./targets/gemini.js";
import { claudeFindings } from "./targets/claude.js";
import { geminiFindings } from "./targets/gemini.js";
import type { Finding, RuleContext } from "./rules/types.js";

export interface DoctorResult {
  findings: Finding[];
  summary: string;
}

/**
 * Verify the wiring: for every detected agent tool, report whether it
 * actually loads the single source of truth. Pure over the inventory.
 */
export function runDoctor(ctx: RuleContext): DoctorResult {
  const chain = codexChain(ctx.fs, ctx.inv);
  const claude = claudeState(ctx.fs, ctx.inv);
  const gemini = geminiState(ctx.fs, ctx.inv);
  const lines = [
    `codex: native AGENTS.md — chain ${chain.files.length} file(s), ${chain.totalBytes} byte(s)`,
    `cursor: native AGENTS.md — ${ctx.inv.agentsFiles.length > 0 ? "present" : "missing"}` +
      (ctx.inv.cursorRules.length > 0
        ? `; .cursor/rules ${ctx.inv.cursorRules.length} file(s)`
        : ""),
    `copilot: cloud agent reads AGENTS.md natively; chat instructions ${
      ctx.inv.copilotInstructions !== undefined ? "present" : "absent"
    }`,
    `claude-code: ${claude}`,
    `gemini-cli: ${gemini}`,
  ];
  const findings = [...claudeFindings(ctx.fs, ctx.inv), ...geminiFindings(ctx.fs, ctx.inv)];
  findings.sort(
    (a, b) => (a.file < b.file ? -1 : a.file > b.file ? 1 : a.ruleId < b.ruleId ? -1 : 1),
  );
  return { findings, summary: lines.join("\n") };
}
