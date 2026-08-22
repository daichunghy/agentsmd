import { buildInventory, findRepoRoot } from "./discovery.js";
import { RealFs, type FileReader } from "./fs-types.js";
import { codexBudgetRule } from "./rules/budget.js";
import { claudeLengthRule } from "./rules/claude-length.js";
import { deadCommandRule } from "./rules/dead-command.js";
import { deadPathRule } from "./rules/dead-path.js";
import { runRules } from "./rules/registry.js";
import type { Finding, Rule, RuleContext } from "./rules/types.js";
import { claudeUnmanagedRule, stubRule } from "./targets/claude.js";
import { geminiUnwiredRule } from "./targets/gemini.js";

/** Rules active in this build; grows as tasks land. */
export const ACTIVE_RULES: Rule[] = [
  deadPathRule,
  deadCommandRule,
  codexBudgetRule,
  claudeLengthRule,
  stubRule,
  claudeUnmanagedRule,
  geminiUnwiredRule,
];

export function lint(ctx: RuleContext): Finding[] {
  return runRules(ctx, ACTIVE_RULES);
}

/** Resolve the current repo from cwd into a RuleContext (or error text). */
export function contextFromCwd(
  fs: FileReader,
  cwd: string,
): { ctx: RuleContext } | { error: string } {
  const root = findRepoRoot(fs, cwd);
  if (root === undefined) {
    return { error: "not inside a git repository" };
  }
  const cwdRel = cwd === root ? "" : cwd.slice(root.length).replace(/^\//, "");
  const inv = buildInventory(fs, root, cwdRel);
  return { ctx: { fs, inv } };
}
