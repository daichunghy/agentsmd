import { describe, expect, it } from "vitest";
import { buildInventory } from "../src/discovery.js";
import { runRules } from "../src/rules/registry.js";
import { codexBudgetRule } from "../src/rules/budget.js";
import { claudeLengthRule } from "../src/rules/claude-length.js";
import { codexChain } from "../src/targets/codex.js";
import type { RuleContext } from "../src/rules/types.js";
import { MemFs } from "./helpers.js";

function ctxFor(tree: Record<string, string>, cwdRel = ""): RuleContext {
  const fs = new MemFs(tree);
  return { fs, inv: buildInventory(fs, "", cwdRel) };
}

const big = (n: number): string => "# x\n" + "y".repeat(n);

describe("codexChain", () => {
  it("walks root→cwd summing one file per directory", () => {
    const ctx = ctxFor(
      {
        ".git/config": "",
        "AGENTS.md": "a".repeat(1000),
        "pkg/AGENTS.md": "b".repeat(500),
      },
      "pkg",
    );
    const chain = codexChain(ctx.fs, ctx.inv);
    expect(chain.files).toEqual(["AGENTS.md", "pkg/AGENTS.md"]);
    expect(chain.totalBytes).toBe(1500);
  });

  it("override replaces the sibling AGENTS.md", () => {
    const ctx = ctxFor(
      {
        ".git/config": "",
        "AGENTS.md": "a".repeat(100),
        "pkg/AGENTS.md": "b".repeat(100),
        "pkg/AGENTS.override.md": "c".repeat(40),
      },
      "pkg",
    );
    const chain = codexChain(ctx.fs, ctx.inv);
    expect(chain.files).toEqual(["AGENTS.md", "pkg/AGENTS.override.md"]);
    expect(chain.totalBytes).toBe(140);
  });
});

describe("codex-budget-overflow", () => {
  it("flags chains over the budget", () => {
    const ctx = ctxFor({
      ".git/config": "",
      "AGENTS.md": big(33000),
    });
    const findings = runRules(ctx, [codexBudgetRule]);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      ruleId: "codex-budget-overflow",
      file: "AGENTS.md",
      line: 1,
      severity: "error",
    });
  });

  it("respects the configured budget override", () => {
    const ctx = ctxFor({
      ".git/config": "",
      "AGENTS.md": big(100),
      "agentsmd.config.json": '{"budgets":{"codexChainBytes":50}}',
    });
    expect(runRules(ctx, [codexBudgetRule])).toHaveLength(1);
  });
});

describe("claude-length-warn", () => {
  it("warns past 200 non-marker lines", () => {
    const lines = Array.from({ length: 205 }, (_, i) => `line ${i + 1}`);
    const ctx = ctxFor({
      ".git/config": "",
      "AGENTS.md": "# g",
      "CLAUDE.md": lines.join("\n"),
    });
    const findings = runRules(ctx, [claudeLengthRule]);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      ruleId: "claude-length-warn",
      file: "CLAUDE.md",
      line: 201,
      severity: "warning",
    });
  });

  it("excludes comment markers and blanks from the count", () => {
    const body = Array.from({ length: 190 }, (_, i) => `line ${i + 1}`);
    const markers = Array.from({ length: 60 }, () => "<!-- agentsmd:x -->");
    const all = [...body, ...markers].sort();
    const ctx = ctxFor({
      ".git/config": "",
      "AGENTS.md": "# g",
      "CLAUDE.md": all.join("\n"),
    });
    expect(runRules(ctx, [claudeLengthRule])).toEqual([]);
  });
});
