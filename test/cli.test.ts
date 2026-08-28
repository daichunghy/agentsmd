import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { runCli } from "../src/cli.js";
import { canonicalJson } from "../src/canonical-json.js";
import { VERSION } from "../src/version.js";
import { captureIo } from "./helpers.js";

describe("cli", () => {
  it("prints version for --version and exits 0", async () => {
    const { code, stdout } = await captureIo(() => runCli(["--version"]));
    expect(code).toBe(0);
    expect(stdout).toBe(VERSION + "\n");
  });

  it("exits 2 for unknown command", async () => {
    const { code, stderr } = await captureIo(() => runCli(["frobnicate"]));
    expect(code).toBe(2);
    expect(stderr).toContain("unknown command: frobnicate");
  });

  it("prints root help listing commands, flags, and npx doctor", async () => {
    const { code, stdout } = await captureIo(() => runCli(["--help"]));
    expect(code).toBe(0);
    expect(stdout).toContain("npx agentsmd doctor");
    for (const needle of [
      "init",
      "lint",
      "doctor",
      "sync",
      "score",
      "--json",
      "--adopt",
      "--copilot-copy",
      "--force",
      "--config",
    ]) {
      expect(stdout).toContain(needle);
    }
  });

  it("exits 0 for -h", async () => {
    const { code } = await captureIo(() => runCli(["-h"]));
    expect(code).toBe(0);
  });

  it("prints per-command help and exits 0", async () => {
    const cases: [string, string][] = [
      ["init", "Usage: agentsmd init"],
      ["lint", "Usage: agentsmd lint"],
      ["doctor", "Usage: agentsmd doctor"],
      ["sync", "Usage: agentsmd sync"],
      ["score", "Usage: agentsmd score"],
      ["mcp", "Usage: agentsmd mcp"],
    ];
    for (const [cmd, usage] of cases) {
      const { code, stdout } = await captureIo(() => runCli([cmd, "--help"]));
      expect(code).toBe(0);
      expect(stdout).toContain(usage);
    }
  });

  it("init --json skips an existing root AGENTS.md", async () => {
    const before = readFileSync(join(process.cwd(), "AGENTS.md"), "utf8");
    const { code, stdout } = await captureIo(() => runCli(["init", "--json"]));
    expect(code).toBe(0);
    expect(stdout).toBe(
      canonicalJson({ skipped: ["AGENTS.md"], wrote: [] }) + "\n",
    );
    expect(readFileSync(join(process.cwd(), "AGENTS.md"), "utf8")).toBe(before);
  });

  it("init without --json reports that AGENTS.md already exists", async () => {
    const { code, stdout } = await captureIo(() => runCli(["init"]));
    expect(code).toBe(0);
    expect(stdout).toContain("AGENTS.md already exists");
    expect(stdout).not.toContain("wrote AGENTS.md");
  });
});
