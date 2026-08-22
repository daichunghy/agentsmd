import { joinRel, type Finding, type Rule } from "./types.js";
import { claudeState } from "../targets/claude.js";

const THRESHOLD = 0.7;

/** Normalize text for similarity: lowercase, strip md syntax, split tokens. */
export function normalizeTokens(text: string): Set<string> {
  const cleaned = text
    .toLowerCase()
    .replace(/<!--.*?-->/gs, "")
    .replace(/[`*_#\[\]()>-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return new Set(cleaned === "" ? [] : cleaned.split(" "));
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter / (a.size + b.size - inter);
}

/**
 * Sprawl detection: another instruction file duplicating the AGENTS.md
 * content. Managed stubs and managed copies are exempt (their body is
 * markers plus a reference, not a duplicate).
 */
export const sprawlRule: Rule = {
  id: "sprawl-duplicate",
  defaultSeverity: "error",
  run(ctx) {
    const rootAgents = ctx.inv.agentsFiles.find((a) => a.rel === "AGENTS.md");
    if (rootAgents === undefined) return [];
    const source = ctx.fs.readUtf8(joinRel(ctx.inv.root, "AGENTS.md"));
    if (source === undefined) return [];
    const sourceTokens = normalizeTokens(source);
    const findings: Finding[] = [];

    const claude = ctx.inv.claude ?? ctx.inv.claudeDot;
    const claudeManaged =
      claude !== undefined &&
      (claudeState(ctx.fs, ctx.inv) === "managed-intact" ||
        claudeState(ctx.fs, ctx.inv) === "managed-broken");

    for (const file of ctx.inv.instructionFiles) {
      if (file === "AGENTS.md") continue;
      if (claudeManaged && file === claude) continue;
      const text = ctx.fs.readUtf8(joinRel(ctx.inv.root, file));
      if (text === undefined) continue;
      const first = (text.split(/\r?\n/)[0] ?? "").trim();
      if (/^<!-- agentsmd:managed/.test(first)) continue;
      if (claudeManaged && file === (ctx.inv.claudeDot ?? "CLAUDE.md")) continue;
      const sim = jaccard(sourceTokens, normalizeTokens(text));
      if (sim >= THRESHOLD) {
        findings.push({
          ruleId: this.id,
          severity: this.defaultSeverity,
          file,
          line: 1,
          message: `content is ${(sim * 100).toFixed(0)}% identical to AGENTS.md — duplicated instruction files rot silently`,
          fixHint: `delete ${file} or wire the tool to AGENTS.md with \`agentsmd sync\``,
        });
      }
    }
    return findings;
  },
};
