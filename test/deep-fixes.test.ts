import { describe, expect, it } from "vitest";
import { buildInventory } from "../src/discovery.js";
import { runCli } from "../src/cli.js";
import { runRules } from "../src/rules/registry.js";
import { sprawlRule } from "../src/rules/sprawl.js";
import { absolutePathRule } from "../src/rules/hygiene.js";
import type { RuleContext } from "../src/rules/types.js";
import { captureIo, MemFs } from "./helpers.js";

function ctxFor(tree: Record<string, string>): RuleContext {
  const fs = new MemFs(tree);
  return { fs, inv: buildInventory(fs, "", "") };
}

describe("strict CLI argument validation", () => {
  it("exits 2 for an unknown flag instead of silently ignoring it", async () => {
    const { code, stderr } = await captureIo(() => runCli(["lint", "--totally-bogus"]));
    expect(code).toBe(2);
    expect(stderr).toContain("unknown flag --totally-bogus");
  });

  it("explains cwd-only operation when --path is used", async () => {
    const { code, stderr } = await captureIo(() => runCli(["doctor", "--path", "/other/repo"]));
    expect(code).toBe(2);
    expect(stderr).toContain("current directory");
  });

  it("exits 2 when --report has no value", async () => {
    const { code, stderr } = await captureIo(() => runCli(["score", "--report"]));
    expect(code).toBe(2);
    expect(stderr).toContain("--report requires a value");
  });

  it("exits 2 for an unexpected positional argument", async () => {
    const { code, stderr } = await captureIo(() => runCli(["sync", "extra"]));
    expect(code).toBe(2);
    expect(stderr).toContain("unexpected argument");
  });

  it("still accepts every documented flag", async () => {
    const { code } = await captureIo(() => runCli(["--version"]));
    expect(code).toBe(0);
  });
});

describe("sprawl subset containment", () => {
  const LONG_SOURCE = [
    "# Guide",
    "",
    "## Setup",
    "Run `npm install` then `npm run build` from the repository root.",
    "",
    "## Build",
    "The build writes output to the dist directory, see docs/build.md.",
    "",
    "## Test",
    "Run `npm test` before opening a pull request. Tests are deterministic.",
    "",
    "## Style",
    "Follow the existing TypeScript style. Strict mode is mandatory.",
  ].join("\n");

  it("flags a file that copies a subset of AGENTS.md below the jaccard threshold", () => {
    const subset = LONG_SOURCE.split("## Style")[0]!.replace("## Setup", "# Copied setup");
    const ctx = ctxFor({
      ".git/config": "",
      "AGENTS.md": LONG_SOURCE,
      "GEMINI.md": subset,
      "package.json": '{"scripts":{"build":"tsc"}}',
    });
    const findings = runRules(ctx, [sprawlRule]);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ ruleId: "sprawl-duplicate", file: "GEMINI.md" });
  });

  it("does not flag short files with a few shared words", () => {
    const ctx = ctxFor({
      ".git/config": "",
      "AGENTS.md": LONG_SOURCE,
      "GEMINI.md": "# Notes\n\nRun `npm test` often.\n",
      "package.json": '{"scripts":{}}',
    });
    const findings = runRules(ctx, [sprawlRule]);
    expect(findings).toHaveLength(0);
  });
});

describe("absolute paths in markdown links", () => {
  it("flags file:// and absolute link targets, not just backticked paths", () => {
    const ctx = ctxFor({
      ".git/config": "",
      "AGENTS.md": [
        "# Guide",
        "",
        "See [the docs](file:///Users/alice/repo/docs/guide.md) first.",
        "Also [config](/etc/defaults.conf) matters.",
      ].join("\n"),
    });
    const findings = runRules(ctx, [absolutePathRule]);
    expect(findings).toHaveLength(2);
    expect(findings[0]!.message).toContain("file:///Users");
    expect(findings[1]!.message).toContain("/etc/defaults.conf");
  });
});
