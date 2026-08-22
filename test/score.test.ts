import { describe, expect, it } from "vitest";
import { buildInventory } from "../src/discovery.js";
import { computeScore, renderScoreText } from "../src/score.js";
import { lint } from "../src/lint.js";
import { canonicalJson } from "../src/canonical-json.js";
import type { RuleContext } from "../src/rules/types.js";
import { MemFs } from "./helpers.js";
import { readFileSync } from "node:fs";

function ctxFor(tree: Record<string, string>): RuleContext {
  const fs = new MemFs(tree);
  return { fs, inv: buildInventory(fs, "", "") };
}

function scored(tree: Record<string, string>) {
  const ctx = ctxFor(tree);
  return { report: computeScore(ctx, lint(ctx)), ctx };
}

const HEALTHY = [
  "# Guide",
  "## Setup",
  "Install with npm.",
  "## Build",
  "`npm run ok`",
  "## Test",
  "`npm run ok` again",
  "## Conventions",
  "Keep it small.",
].join("\n");

/** Minimal hand-rolled validator mirroring schemas/score-report.schema.json. */
function validateReport(r: unknown): string[] {
  const errs: string[] = [];
  const o = r as Record<string, unknown>;
  if (typeof o !== "object" || o === null) return ["not an object"];
  if (o["schemaVersion"] !== "1.0.0") errs.push("schemaVersion");
  if (typeof o["score"] !== "number" || o["score"] < 0 || o["score"] > 100) errs.push("score");
  const b = o["breakdown"] as Record<string, unknown> | undefined;
  if (typeof b !== "object" || b === null) return [...errs, "breakdown"];
  for (const [k, max] of [
    ["coverage", 30],
    ["freshness", 30],
    ["wiring", 25],
    ["size", 15],
  ] as const) {
    const v = b[k];
    if (typeof v !== "number" || v < 0 || v > max) errs.push(`breakdown.${k}`);
  }
  if (!Array.isArray(o["notes"]) || o["notes"].some((n) => typeof n !== "string")) {
    errs.push("notes");
  }
  return errs;
}

describe("computeScore", () => {
  it("healthy single-tool repo scores 100 with the no-targets note", () => {
    const { report } = scored({
      ".git/config": "",
      "AGENTS.md": HEALTHY,
      "package.json": '{"scripts":{"ok":"echo ok"}}',
    });
    expect(report.score).toBe(100);
    expect(report.breakdown).toEqual({ coverage: 30, freshness: 30, wiring: 25, size: 15 });
    expect(report.notes).toContain("wiring: no wiring targets present");
  });

  it("sprawl and unmanaged stub deduct freshness and wiring deterministically", () => {
    const tree = {
      ".git/config": "",
      "AGENTS.md": HEALTHY,
      "package.json": '{"scripts":{"ok":"echo ok"}}',
      "GEMINI.md": HEALTHY.replace("Keep it small.", "Keep it tiny."),
      "CLAUDE.md": "# my rules\n",
    };
    const a = scored(tree).report;
    const b = scored(tree).report;
    expect(a).toEqual(b);
    expect(a.breakdown.freshness).toBeLessThan(30);
    expect(a.breakdown.wiring).toBeLessThan(25);
    expect(a.notes.join(" ")).toContain("wiring");
    expect(validateReport(a)).toEqual([]);
  });

  it("missing headings cap coverage", () => {
    const { report } = scored({ ".git/config": "", "AGENTS.md": "# only build\n" });
    expect(report.breakdown.coverage).toBe(8);
  });

  it("chain overflow zeroes size", () => {
    const { report } = scored({
      ".git/config": "",
      "AGENTS.md": "# x\n" + "y".repeat(33000),
    });
    expect(report.breakdown.size).toBe(0);
  });

  it("schema file is present and reports validate against its shape", () => {
    const schema = JSON.parse(
      readFileSync("schemas/score-report.schema.json", "utf8"),
    ) as { required: string[] };
    expect(schema.required).toEqual(["schemaVersion", "score", "breakdown", "notes"]);
    const { report } = scored({ ".git/config": "", "AGENTS.md": HEALTHY });
    expect(validateReport(report)).toEqual([]);
  });

  it("text/JSON parity and byte determinism", () => {
    const tree = {
      ".git/config": "",
      "AGENTS.md": HEALTHY,
      "package.json": '{"scripts":{"ok":"echo ok"}}',
      "CLAUDE.md": "# mine\n",
    };
    const ctx = ctxFor(tree);
    const r1 = computeScore(ctx, lint(ctx));
    const r2 = computeScore(ctx, lint(ctx));
    expect(canonicalJson(r1)).toBe(canonicalJson(r2));
    const text = renderScoreText(r1);
    expect(text).toContain(`${r1.score}/100`);
    expect(text).toContain(`${r1.breakdown.coverage}/30`);
  });
});
