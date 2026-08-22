import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { buildInventory } from "../src/discovery.js";
import { lint } from "../src/lint.js";
import { computeScore } from "../src/score.js";
import { canonicalJson } from "../src/canonical-json.js";
import type { RuleContext } from "../src/rules/types.js";
import { MemFs } from "./helpers.js";

export const FIXTURES = [
  "healthy-single-tool",
  "sprawl",
  "broken-stub",
  "adopt",
  "gemini-merge",
  "budget-overflow",
  "hygiene",
] as const;

export function loadFixtureTree(dir: string): Record<string, string> {
  const files: Record<string, string> = {};
  const walk = (rel: string): void => {
    const abs = join(dir, rel);
    for (const name of readdirSync(abs)) {
      const childRel = rel === "" ? name : `${rel}/${name}`;
      const absChild = join(dir, childRel);
      if (statSync(absChild).isDirectory()) {
        if (name === ".git" || name === "node_modules") continue;
        walk(childRel);
      } else {
        files[childRel] = readFileSync(absChild, "utf8");
      }
    }
  };
  walk("");
  files[".git/config"] = "";
  return files;
}

export function goldenFor(name: string, fs?: boolean): RuleContext {
  const tree = loadFixtureTree(join("fixtures", name));
  const mem = new MemFs(tree);
  return { fs: mem, inv: buildInventory(mem, "", "") };
}

describe("golden fixtures", () => {
  for (const name of FIXTURES) {
    it(`${name}: lint and score match the committed golden snapshot`, () => {
      const ctx = goldenFor(name);
      const findings = lint(ctx);
      const score = computeScore(ctx, findings);
      const snapshot = canonicalJson({ findings, score }) + "\n";
      const goldenPath = join("test/golden", `${name}.json`);
      let expected: string;
      try {
        expected = readFileSync(goldenPath, "utf8");
      } catch {
        mkdirSync("test/golden", { recursive: true });
        writeFileSync(goldenPath, snapshot);
        throw new Error(`golden snapshot missing; wrote ${goldenPath} — commit it`);
      }
      expect(snapshot).toBe(expected);
    });
  }

  it("repeat runs are byte-identical across all fixtures", () => {
    for (const name of FIXTURES) {
      const ctx = goldenFor(name);
      const a = canonicalJson({ findings: lint(ctx), score: computeScore(ctx, lint(ctx)) });
      const ctx2 = goldenFor(name);
      const b = canonicalJson({ findings: lint(ctx2), score: computeScore(ctx2, lint(ctx2)) });
      expect(a).toBe(b);
    }
  });
});
