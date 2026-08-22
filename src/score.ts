import { parseMarkdown, headingOf } from "./markdown.js";
import { joinRel, type Finding, type RuleContext } from "./rules/types.js";

export interface ScoreReport {
  schemaVersion: "1.0.0";
  score: number;
  breakdown: {
    coverage: number;
    freshness: number;
    wiring: number;
    size: number;
  };
  notes: string[];
}

const WIRING_RULES = new Set([
  "stub-broken",
  "claude-unmanaged",
  "gemini-unwired",
  "sprawl-duplicate",
]);

/**
 * Score model v1 (deterministic, explainable). Every deduction appends a
 * note so the number is never a mystery. See spec §8.
 */
export function computeScore(ctx: RuleContext, findings: Finding[]): ScoreReport {
  const notes: string[] = [];

  // Coverage (30): heading presence in the root AGENTS.md.
  const agentsText = ctx.fs.readUtf8(joinRel(ctx.inv.root, "AGENTS.md")) ?? "";
  const titles = parseMarkdown(agentsText).lines
    .map(headingOf)
    .filter((h): h is { level: number; title: string } => h !== undefined)
    .map((h) => h.title);
  const has = (re: RegExp): boolean => titles.some((t) => re.test(t));
  const coverage =
    (has(/setup|install/) ? 8 : 0) +
    (has(/build/) ? 8 : 0) +
    (has(/test/) ? 8 : 0) +
    (has(/style|convention|architect/) ? 6 : 0);
  if (coverage < 30) notes.push("coverage: add missing setup/build/test/style sections to AGENTS.md");

  // Freshness (30): −10 per error, −3 per warning, floor 0.
  const errors = findings.filter((f) => f.severity === "error").length;
  const warnings = findings.filter((f) => f.severity === "warning").length;
  const freshness = Math.max(0, 30 - 10 * errors - 3 * warnings);
  if (freshness < 30) notes.push(`freshness: ${errors} error(s), ${warnings} warning(s) from lint`);

  // Wiring (25): −8 per wiring error, −4 per wiring warning; full marks
  // (with note) when no wiring targets exist at all.
  const wiringFindings = findings.filter((f) => WIRING_RULES.has(f.ruleId));
  const targetsDetected =
    ctx.fs.exists(joinRel(ctx.inv.root, "CLAUDE.md")) ||
    ctx.fs.exists(joinRel(ctx.inv.root, ".claude/CLAUDE.md")) ||
    ctx.fs.exists(joinRel(ctx.inv.root, "GEMINI.md")) ||
    ctx.fs.exists(joinRel(ctx.inv.root, ".gemini/settings.json")) ||
    ctx.fs.exists(joinRel(ctx.inv.root, ".github/copilot-instructions.md"));
  let wiring: number;
  if (!targetsDetected) {
    wiring = 25;
    notes.push("wiring: no wiring targets present");
  } else {
    const wErr = wiringFindings.filter((f) => f.severity === "error").length;
    const wWarn = wiringFindings.filter((f) => f.severity === "warning").length;
    wiring = Math.max(0, 25 - 8 * wErr - 4 * wWarn);
    if (wiring < 25) notes.push(`wiring: ${wErr} wiring error(s), ${wWarn} wiring warning(s)`);
  }

  // Size (15): root AGENTS.md bytes against stepped budgets; chain
  // overflow zeroes the category.
  const rootBytes = ctx.fs.readBytes(joinRel(ctx.inv.root, "AGENTS.md"))?.length ?? 0;
  let size: number;
  if (findings.some((f) => f.ruleId === "codex-budget-overflow")) {
    size = 0;
    notes.push("size: codex chain over budget");
  } else if (rootBytes <= 16384) size = 15;
  else if (rootBytes <= 24576) {
    size = 10;
    notes.push("size: root AGENTS.md between 16 KiB and 24 KiB");
  } else if (rootBytes <= 28672) {
    size = 5;
    notes.push("size: root AGENTS.md between 24 KiB and 28 KiB");
  } else {
    size = 0;
    notes.push("size: root AGENTS.md over 28 KiB");
  }

  const score = coverage + freshness + wiring + size;
  return { schemaVersion: "1.0.0", score, breakdown: { coverage, freshness, wiring, size }, notes };
}

/** Human renderer for score reports (parity with JSON numbers). */
export function renderScoreText(report: ScoreReport): string {
  const b = report.breakdown;
  const lines = [
    `agentsmd score: ${report.score}/100 (schema ${report.schemaVersion})`,
    `  coverage ${b.coverage}/30 | freshness ${b.freshness}/30 | wiring ${b.wiring}/25 | size ${b.size}/15`,
    ...report.notes.map((n) => `  - ${n}`),
  ];
  return lines.join("\n") + "\n";
}
