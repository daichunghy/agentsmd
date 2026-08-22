import { describe, expect, it } from "vitest";
import { ConfigError, loadConfig } from "../src/config.js";
import { buildInventory, findRepoRoot } from "../src/discovery.js";
import { lint } from "../src/lint.js";
import { MemFs } from "./helpers.js";

const TREE: Record<string, string> = {
  ".git/config": "",
  "AGENTS.md": "# root",
  "CLAUDE.md": "# claude",
  "GEMINI.md": "# gemini",
  ".gemini/settings.json": "{}",
  ".github/copilot-instructions.md": "# copilot",
  ".github/instructions/py.instructions.md": "# py",
  ".cursor/rules/a.mdc": "# rule",
  "pkg/AGENTS.md": "# nested",
  "pkg/src/main.ts": "export {};",
  "node_modules/x/AGENTS.md": "skip me",
};

describe("findRepoRoot", () => {
  it("finds the .git owner walking up from a nested cwd", () => {
    const fs = new MemFs(TREE);
    expect(findRepoRoot(fs, "pkg/src")).toBe("");
  });

  it("returns undefined outside any repo", () => {
    expect(findRepoRoot(new MemFs({}), "a/b")).toBeUndefined();
  });
});

describe("buildInventory", () => {
  const inv = buildInventory(new MemFs(TREE), "", "pkg");

  it("collects root and nested AGENTS.md but skips node_modules", () => {
    expect(inv.agentsFiles.map((a) => a.rel)).toEqual(["AGENTS.md", "pkg/AGENTS.md"]);
    expect(inv.agentsFiles[0]?.bytes).toBeGreaterThan(0);
  });

  it("detects per-tool surfaces", () => {
    expect(inv.claude).toBe("CLAUDE.md");
    expect(inv.claudeDot).toBeUndefined();
    expect(inv.gemini).toBe("GEMINI.md");
    expect(inv.geminiSettings).toBe(".gemini/settings.json");
    expect(inv.copilotInstructions).toBe(".github/copilot-instructions.md");
    expect(inv.copilotPathInstructions).toEqual([
      ".github/instructions/py.instructions.md",
    ]);
    expect(inv.cursorRules).toEqual([".cursor/rules/a.mdc"]);
  });

  it("aggregates instruction files for rules", () => {
    expect(inv.instructionFiles).toContain("AGENTS.md");
    expect(inv.instructionFiles).toContain("pkg/AGENTS.md");
    expect(inv.instructionFiles).toContain("CLAUDE.md");
    expect(inv.instructionFiles).not.toContain(".cursor/rules/a.mdc");
  });

  it("skips fixtures, coverage, and action-dist trees", () => {
    const fs = new MemFs({
      ".git/config": "",
      "AGENTS.md": "# root\n",
      "fixtures/x/AGENTS.md": "see `missing/path.ts`\n",
      "coverage/AGENTS.md": "see `also/missing.ts`\n",
      "action-dist/AGENTS.md": "see `nope.ts`\n",
    });
    const skipped = buildInventory(fs, "", "");
    expect(skipped.agentsFiles.map((a) => a.rel)).toEqual(["AGENTS.md"]);
    const findings = lint({ fs, inv: skipped });
    expect(findings.some((f) => f.file.startsWith("fixtures/"))).toBe(false);
    expect(findings.some((f) => f.ruleId === "dead-path")).toBe(false);
  });
});

describe("loadConfig", () => {
  it("defaults without a config file", () => {
    const cfg = loadConfig(new MemFs({}), "");
    expect(cfg.failOn).toBe("error");
    expect(cfg.budgets.codexChainBytes).toBe(32768);
    expect(cfg.rules).toEqual({});
  });

  it("accepts valid overrides", () => {
    const fs = new MemFs({
      "agentsmd.config.json":
        '{"failOn":"warning","budgets":{"codexChainBytes":1000},"rules":{"dead-path":"off"}}',
    });
    const cfg = loadConfig(fs, "");
    expect(cfg.failOn).toBe("warning");
    expect(cfg.budgets.codexChainBytes).toBe(1000);
    expect(cfg.rules["dead-path"]).toBe("off");
  });

  it("rejects invalid severity", () => {
    const fs = new MemFs({
      "agentsmd.config.json": '{"rules":{"dead-path":"fatal"}}',
    });
    expect(() => loadConfig(fs, "")).toThrow(ConfigError);
  });

  it("rejects malformed JSON", () => {
    const fs = new MemFs({ "agentsmd.config.json": "{ nope" });
    expect(() => loadConfig(fs, "")).toThrow(ConfigError);
  });
});
