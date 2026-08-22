import { describe, expect, it } from "vitest";
import { buildInventory } from "../src/discovery.js";
import { canonicalJson } from "../src/canonical-json.js";
import { lint } from "../src/lint.js";
import {
  exitCodeFor,
  renderJson,
  renderText,
} from "../src/report.js";
import { runRules } from "../src/rules/registry.js";
import { deadCommandRule } from "../src/rules/dead-command.js";
import { deadPathRule } from "../src/rules/dead-path.js";
import type { RuleContext } from "../src/rules/types.js";
import { MemFs } from "./helpers.js";

function ctxFor(tree: Record<string, string>): RuleContext {
  const fs = new MemFs(tree);
  const inv = buildInventory(fs, "", "");
  return { fs, inv };
}

const TREE: Record<string, string> = {
  ".git/config": "",
  "AGENTS.md": [
    "# Guide",
    "",
    "Code lives in `src/missing`.",
    "",
    "Run `npm run build` before committing.",
    "Sanity: `npm run ok`.",
  ].join("\n"),
  "package.json": JSON.stringify({ scripts: { ok: "echo ok" } }),
};

describe("dead-path", () => {
  it("flags missing backtick paths at the right line", () => {
    const findings = runRules(ctxFor(TREE), [deadPathRule]);
    const f = findings.find((x) => x.ruleId === "dead-path");
    expect(f).toMatchObject({
      file: "AGENTS.md",
      line: 3,
      severity: "error",
    });
    expect(f?.message).toContain("src/missing");
  });

  it("ignores plain words and URLs", () => {
    const ctx = ctxFor({
      ".git/config": "",
      "AGENTS.md": "Use `npm` and see `https://x.dev/y` and `docs`.",
    });
    expect(runRules(ctx, [deadPathRule])).toEqual([]);
  });
});

describe("dead-command", () => {
  it("flags undefined npm scripts", () => {
    const findings = runRules(ctxFor(TREE), [deadCommandRule]);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      ruleId: "dead-command",
      file: "AGENTS.md",
      line: 5,
    });
  });
});

describe("registry + renderers", () => {
  it("applies severity overrides and off", () => {
    const ctx = ctxFor({
      ...TREE,
      "agentsmd.config.json": '{"rules":{"dead-path":"warning","dead-command":"off"}}',
    });
    const findings = runRules(ctx, [deadPathRule, deadCommandRule]);
    expect(findings.map((f) => f.ruleId)).toEqual(["dead-path"]);
    expect(findings[0]?.severity).toBe("warning");
  });

  it("text/JSON parity and determinism", () => {
    const ctx = ctxFor(TREE);
    const a = lint(ctx);
    const b = lint(ctx);
    expect(renderJson(a)).toBe(renderJson(b));
    expect(JSON.parse(renderJson(a))).toEqual(a);
    const text = renderText(a);
    for (const f of a) {
      expect(text).toContain(`${f.file}:${f.line}`);
    }
    expect(renderText([])).toBe("agentsmd: no findings\n");
  });

  it("canonical json has sorted keys", () => {
    const s = canonicalJson({ b: 1, a: { z: 1, c: 2 } });
    expect(s.indexOf('"a"')).toBeLessThan(s.indexOf('"b"'));
  });

  it("exit codes follow fail-on threshold", () => {
    const err = { ruleId: "x", severity: "error" as const, file: "a", line: 1, message: "m", fixHint: "h" };
    const warn = { ...err, severity: "warning" as const };
    expect(exitCodeFor([], "error")).toBe(0);
    expect(exitCodeFor([warn], "error")).toBe(0);
    expect(exitCodeFor([warn], "warning")).toBe(1);
    expect(exitCodeFor([err], "error")).toBe(1);
  });
});
