import { joinRel, type Finding, type Rule } from "./types.js";
import { claudeState } from "../targets/claude.js";

const THRESHOLD = 0.7;
/** Containment threshold: |A∩B| / |B| — catches files that copy a subset. */
const CONTAINMENT_THRESHOLD = 0.8;
/** Minimum unique tokens before subset containment is meaningful. */
const MIN_TOKENS = 20;

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

/** Share of `other`'s tokens already present in `source` (subset copy). */
function containment(source: Set<string>, other: Set<string>): number {
  if (other.size === 0) return 0;
  let inter = 0;
  for (const t of other) if (source.has(t)) inter++;
  return inter / other.size;
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
      const otherTokens = normalizeTokens(text);
      const sim = jaccard(sourceTokens, otherTokens);
      const contained =
        otherTokens.size >= MIN_TOKENS ? containment(sourceTokens, otherTokens) : 0;
      if (sim >= THRESHOLD || contained >= CONTAINMENT_THRESHOLD) {
        const overlap = Math.max(sim, contained);
        findings.push({
          ruleId: this.id,
          severity: this.defaultSeverity,
          file,
          line: 1,
          message: `content overlaps AGENTS.md by ${(overlap * 100).toFixed(0)}% — duplicated instruction files rot silently`,
          fixHint: `delete ${file} or wire the tool to AGENTS.md with \`agentsmd sync\``,
        });
      }
    }
    return findings;
  },
};
