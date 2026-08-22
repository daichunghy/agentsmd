import { describe, expect, it } from "vitest";
import { buildInventory } from "../src/discovery.js";
import { runRules } from "../src/rules/registry.js";
import { claudeState, stubRule, claudeUnmanagedRule, IMPORT_BEGIN, IMPORT_END } from "../src/targets/claude.js";
import { geminiState, geminiUnwiredRule } from "../src/targets/gemini.js";
import { runDoctor } from "../src/wiring.js";
import type { RuleContext } from "../src/rules/types.js";
import { canonicalJson } from "../src/canonical-json.js";
import { MemFs } from "./helpers.js";

function ctxFor(tree: Record<string, string>, cwdRel = ""): RuleContext {
  const fs = new MemFs(tree);
  return { fs, inv: buildInventory(fs, "", cwdRel) };
}

const STUB = [IMPORT_BEGIN, "@AGENTS.md", IMPORT_END].join("\n") + "\n";

describe("claudeState", () => {
  it("absent when no CLAUDE.md anywhere", () => {
    expect(claudeState(ctxFor({ ".git/config": "", "AGENTS.md": "# g" }).fs, ctxFor({ ".git/config": "", "AGENTS.md": "# g" }).inv)).toBe("absent");
  });
  it("managed-intact for pristine stub", () => {
    const ctx = ctxFor({ ".git/config": "", "AGENTS.md": "# g", "CLAUDE.md": STUB });
    expect(claudeState(ctx.fs, ctx.inv)).toBe("managed-intact");
    expect(runRules(ctx, [stubRule, claudeUnmanagedRule])).toEqual([]);
  });
  it("managed-broken when import line edited out", () => {
    const broken = STUB.replace("@AGENTS.md", "@OLD.md");
    const ctx = ctxFor({ ".git/config": "", "AGENTS.md": "# g", "CLAUDE.md": broken });
    expect(claudeState(ctx.fs, ctx.inv)).toBe("managed-broken");
    const findings = runRules(ctx, [stubRule, claudeUnmanagedRule]);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ ruleId: "stub-broken", severity: "error", file: "CLAUDE.md" });
  });
  it("unmanaged for hand-written CLAUDE.md", () => {
    const ctx = ctxFor({ ".git/config": "", "AGENTS.md": "# g", "CLAUDE.md": "# my rules\n" });
    expect(claudeState(ctx.fs, ctx.inv)).toBe("unmanaged");
    const findings = runRules(ctx, [stubRule, claudeUnmanagedRule]);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ ruleId: "claude-unmanaged", severity: "warning" });
  });
});

describe("geminiState", () => {
  it("absent without any gemini surface", () => {
    const ctx = ctxFor({ ".git/config": "", "AGENTS.md": "# g" });
    expect(geminiState(ctx.fs, ctx.inv)).toBe("absent");
    expect(runRules(ctx, [geminiUnwiredRule])).toEqual([]);
  });
  it("wired when context.fileName includes AGENTS.md", () => {
    const ctx = ctxFor({
      ".git/config": "",
      "AGENTS.md": "# g",
      "GEMINI.md": "# g2",
      ".gemini/settings.json": '{"context":{"fileName":["AGENTS.md","GEMINI.md"]}}',
    });
    expect(geminiState(ctx.fs, ctx.inv)).toBe("wired");
  });
  it("unwired when fileName misses AGENTS.md (string or array)", () => {
    for (const settings of ['{"context":{"fileName":"GEMINI.md"}}', '{"context":{"fileName":["GEMINI.md"]}}', "{"]) {
      const ctx = ctxFor({
        ".git/config": "",
        "AGENTS.md": "# g",
        "GEMINI.md": "# g2",
        ".gemini/settings.json": settings,
      });
      expect(geminiState(ctx.fs, ctx.inv)).toBe("unwired");
      expect(runRules(ctx, [geminiUnwiredRule])).toHaveLength(1);
    }
  });
});

describe("runDoctor", () => {
  it("summarizes every detected tool deterministically", () => {
    const ctx = ctxFor({
      ".git/config": "",
      "AGENTS.md": "# g",
      "CLAUDE.md": "# mine\n",
    });
    const a = runDoctor(ctx);
    const b = runDoctor(ctx);
    expect(a.summary).toBe(b.summary);
    expect(a.summary).toContain("codex: native");
    expect(a.summary).toContain("cursor: native AGENTS.md — present");
    expect(a.summary).toContain("claude-code: unmanaged");
    expect(a.summary).toContain("gemini-cli: absent");
    expect(a.findings.map((f) => f.ruleId)).toEqual(["claude-unmanaged"]);
    expect(canonicalJson(a)).toBe(canonicalJson(b));
  });
});
