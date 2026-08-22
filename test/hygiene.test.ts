import { describe, expect, it } from "vitest";
import { buildInventory } from "../src/discovery.js";
import { runRules } from "../src/rules/registry.js";
import { sprawlRule, normalizeTokens } from "../src/rules/sprawl.js";
import { absolutePathRule, secretLikeRule, todoRotRule } from "../src/rules/hygiene.js";
import { copilotCopyState } from "../src/targets/copilot.js";
import type { RuleContext } from "../src/rules/types.js";
import { sha256Hex } from "../src/canonical-json.js";
import { MemFs } from "./helpers.js";

function ctxFor(tree: Record<string, string>): RuleContext {
  const fs = new MemFs(tree);
  return { fs, inv: buildInventory(fs, "", "") };
}

const GUIDE = [
  "# Guide",
  "",
  "Run `npm run ok` after editing files in `src`.",
  "Keep tests passing.",
].join("\n");

describe("sprawl-duplicate", () => {
  it("flags near-identical GEMINI.md", () => {
    const ctx = ctxFor({
      ".git/config": "",
      "AGENTS.md": GUIDE,
      "GEMINI.md": GUIDE.replace("Keep tests passing.", "Keep tests green."),
      "package.json": '{"scripts":{"ok":"echo"}}',
    });
    const findings = runRules(ctx, [sprawlRule]);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      ruleId: "sprawl-duplicate",
      file: "GEMINI.md",
      severity: "error",
    });
  });

  it("does not flag genuinely different files", () => {
    const ctx = ctxFor({
      ".git/config": "",
      "AGENTS.md": GUIDE,
      "GEMINI.md": "# Notes\n\nCompletely unrelated cooking recipe text here.\n",
    });
    expect(runRules(ctx, [sprawlRule])).toEqual([]);
  });

  it("exempts managed stubs and managed copies", () => {
    const body = "npm run ok after editing files in src keep tests passing";
    const hash = sha256Hex(body + "\n").slice(0, 8);
    const ctx = ctxFor({
      ".git/config": "",
      "AGENTS.md": GUIDE,
      "CLAUDE.md": "<!-- agentsmd:begin:import -->\n@AGENTS.md\n<!-- agentsmd:end:import -->\n",
      ".github/copilot-instructions.md": `<!-- agentsmd:managed sha256:${hash} -->\n${body}\n`,
    });
    expect(runRules(ctx, [sprawlRule])).toEqual([]);
    expect(copilotCopyState(ctx.fs, ctx.inv)).toBe("managed-intact");
  });

  it("flags an unmanaged CLAUDE.md that duplicates AGENTS.md", () => {
    const ctx = ctxFor({
      ".git/config": "",
      "AGENTS.md": GUIDE,
      "CLAUDE.md": GUIDE,
    });
    expect(runRules(ctx, [sprawlRule])).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ ruleId: "sprawl-duplicate", file: "CLAUDE.md" }),
      ]),
    );
  });

  it("detects tampered managed copies", () => {
    const ctx = ctxFor({
      ".git/config": "",
      "AGENTS.md": GUIDE,
      ".github/copilot-instructions.md": `<!-- agentsmd:managed sha256:deadbeef -->\nhand edit\n`,
    });
    expect(copilotCopyState(ctx.fs, ctx.inv)).toBe("managed-broken");
  });

  it("normalizeTokens strips markers and syntax deterministically", () => {
    const a = normalizeTokens("<!-- x -->\n# Run `npm` *now*");
    const b = normalizeTokens("run npm now");
    expect(a).toEqual(b);
  });
});

describe("hygiene rules", () => {
  const TREE: Record<string, string> = {
    ".git/config": "",
    "AGENTS.md": [
      "# Guide",
      "TODO: tidy this file",
      "token: \"abcdefghij0123456789\"",
      "key lives at `/Users/me/secret.txt`",
      "safe token: \"short\"",
    ].join("\n"),
  };

  it("todo-rot flags TODO lines", () => {
    const f = runRules(ctxFor(TREE), [todoRotRule]);
    expect(f).toHaveLength(1);
    expect(f[0]).toMatchObject({ ruleId: "todo-rot", file: "AGENTS.md", line: 2 });
  });

  it("secret-like flags long assignments but not short values", () => {
    const f = runRules(ctxFor(TREE), [secretLikeRule]);
    expect(f).toHaveLength(1);
    expect(f[0]?.line).toBe(3);
  });

  it("absolute-path flags unix and windows home paths", () => {
    const f = runRules(ctxFor(TREE), [absolutePathRule]);
    expect(f).toHaveLength(1);
    expect(f[0]?.message).toContain("/Users/me/secret.txt");
    const win = ctxFor({
      ".git/config": "",
      "AGENTS.md": "log at `C:\\temp\\x.log`",
    });
    expect(runRules(win, [absolutePathRule])).toHaveLength(1);
  });
});
