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
});
