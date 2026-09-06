import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { actionEvaluate, formatAnnotation } from "../src/action/index.js";
import type { Finding } from "../src/rules/types.js";

const finding: Finding = {
  ruleId: "dead-path",
  severity: "error",
  file: "AGENTS.md",
  line: 3,
  message: "path `src/missing` referenced in instructions does not exist",
  fixHint: "remove or update the reference",
};

describe("formatAnnotation", () => {
  it("renders a GitHub workflow command annotation", () => {
    expect(formatAnnotation(finding)).toBe(
      "::error file=AGENTS.md,line=3::agentsmd dead-path: path `src/missing` referenced in instructions does not exist",
    );
  });

  it("flattens newlines in messages", () => {
    expect(
      formatAnnotation({ ...finding, message: "line1\nline2", severity: "warning" }),
    ).not.toContain("\nline2");
  });
});

describe("actionEvaluate on this repository", () => {
  it("evaluates the workspace without crashing and respects never", () => {
    const result = actionEvaluate(process.cwd(), "never");
    if ("error" in result) throw new Error(result.error);
    expect(result.fail).toBe(false);
    expect(result.score.score).toBeGreaterThanOrEqual(0);
    expect(result.score.score).toBeLessThanOrEqual(100);
    expect(result.annotations.length).toBe(result.findings.length);
  });

  it("fails closed when a custom config path is missing", () => {
    const result = actionEvaluate(process.cwd(), "never", "does-not-exist.json");
    expect(result).toEqual(
      expect.objectContaining({ error: expect.stringContaining("does-not-exist.json") }),
    );
  });

  it("loads a custom config filename and flips the fail decision", () => {
    const dir = mkdtempSync(join(tmpdir(), "agentsmd-action-config-"));
    mkdirSync(join(dir, ".git"));
    writeFileSync(
      join(dir, "AGENTS.md"),
      "# Agent guide\n\nRead `docs/missing.md` before editing.\n",
    );
    writeFileSync(
      join(dir, "strict.config.json"),
      JSON.stringify({ rules: { "dead-path": "error" } }),
    );
    writeFileSync(
      join(dir, "relaxed.config.json"),
      JSON.stringify({ rules: { "dead-path": "warning" } }),
    );
    const strict = actionEvaluate(dir, "error", "strict.config.json");
    const relaxed = actionEvaluate(dir, "error", "relaxed.config.json");
    if ("error" in strict) throw new Error(`strict config failed to load: ${strict.error}`);
    if ("error" in relaxed) throw new Error(`relaxed config failed to load: ${relaxed.error}`);
    expect(strict.findings.some((f) => f.ruleId === "dead-path" && f.severity === "error")).toBe(
      true,
    );
    expect(relaxed.findings.some((f) => f.ruleId === "dead-path" && f.severity === "error")).toBe(
      false,
    );
    expect(strict.fail).toBe(true);
    expect(relaxed.fail).toBe(false);
  });
});
