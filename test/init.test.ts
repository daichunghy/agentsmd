import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config.js";
import { buildInventory } from "../src/discovery.js";
import {
  EXAMPLE_CONFIG,
  runInit,
  STARTER_AGENTS_MD,
} from "../src/init.js";
import { lint } from "../src/lint.js";
import { computeScore } from "../src/score.js";
import { MemFs } from "./helpers.js";

describe("runInit", () => {
  it("creates a starter AGENTS.md when missing", () => {
    const fs = new MemFs({ ".git/config": "" });
    expect(runInit(fs, "", { force: false, config: false })).toEqual({
      skipped: [],
      wrote: ["AGENTS.md"],
    });
    expect(fs.readUtf8("AGENTS.md")).toBe(STARTER_AGENTS_MD);
  });

  it("refuses to overwrite an existing AGENTS.md", () => {
    const fs = new MemFs({ ".git/config": "", "AGENTS.md": "# mine\n" });
    expect(runInit(fs, "", { force: false, config: false })).toEqual({
      skipped: ["AGENTS.md"],
      wrote: [],
    });
    expect(fs.readUtf8("AGENTS.md")).toBe("# mine\n");
  });

  it("overwrites AGENTS.md with --force", () => {
    const fs = new MemFs({ ".git/config": "", "AGENTS.md": "# mine\n" });
    expect(runInit(fs, "", { force: true, config: false })).toEqual({
      skipped: [],
      wrote: ["AGENTS.md"],
    });
    expect(fs.readUtf8("AGENTS.md")).toBe(STARTER_AGENTS_MD);
  });

  it("writes agentsmd.config.json only with --config", () => {
    const fs = new MemFs({ ".git/config": "" });
    expect(runInit(fs, "", { force: false, config: true })).toEqual({
      skipped: [],
      wrote: ["AGENTS.md", "agentsmd.config.json"],
    });
    expect(fs.readUtf8("agentsmd.config.json")).toBe(EXAMPLE_CONFIG);
    expect(loadConfig(fs, "")).toEqual({
      failOn: "error",
      budgets: { codexChainBytes: 32768 },
      rules: {},
    });
  });

  it("refuses to overwrite config unless --force", () => {
    const fs = new MemFs({
      ".git/config": "",
      "AGENTS.md": "# mine\n",
      "agentsmd.config.json": '{"failOn":"warning"}',
    });
    expect(runInit(fs, "", { force: false, config: true })).toEqual({
      skipped: ["AGENTS.md", "agentsmd.config.json"],
      wrote: [],
    });
    expect(fs.readUtf8("agentsmd.config.json")).toBe('{"failOn":"warning"}');
    expect(runInit(fs, "", { force: true, config: true })).toEqual({
      skipped: [],
      wrote: ["AGENTS.md", "agentsmd.config.json"],
    });
    expect(fs.readUtf8("agentsmd.config.json")).toBe(EXAMPLE_CONFIG);
  });

  it("does not write CLAUDE.md, GEMINI.md, or Copilot files", () => {
    const fs = new MemFs({ ".git/config": "" });
    runInit(fs, "", { force: true, config: true });
    expect(fs.readUtf8("CLAUDE.md")).toBeUndefined();
    expect(fs.readUtf8("GEMINI.md")).toBeUndefined();
    expect(fs.readUtf8(".github/copilot-instructions.md")).toBeUndefined();
  });

  it("starter has score coverage headings and no TODO/FIXME", () => {
    expect(STARTER_AGENTS_MD).toMatch(/^## Setup$/m);
    expect(STARTER_AGENTS_MD).toMatch(/^## Build$/m);
    expect(STARTER_AGENTS_MD).toMatch(/^## Test$/m);
    expect(STARTER_AGENTS_MD).toMatch(/^## Conventions$/m);
    expect(STARTER_AGENTS_MD).not.toMatch(/\bTODO\b|\bFIXME\b/);
    const fs = new MemFs({ ".git/config": "", "AGENTS.md": STARTER_AGENTS_MD });
    const ctx = { fs, inv: buildInventory(fs, "", "") };
    const score = computeScore(ctx, lint(ctx));
    expect(score.breakdown.coverage).toBe(30);
  });
});
