import { codexChain } from "../targets/codex.js";
import type { Finding, Rule } from "./types.js";

/**
 * The combined Codex instruction chain (root→cwd, one file per directory)
 * is truncated at project_doc_max_bytes (32 KiB by default). Flag when the
 * repo already exceeds the configured budget.
 */
export const codexBudgetRule: Rule = {
  id: "codex-budget-overflow",
  defaultSeverity: "error",
  run(ctx) {
    const chain = codexChain(ctx.fs, ctx.inv);
    const budget = ctx.inv.config.budgets.codexChainBytes;
    if (chain.totalBytes <= budget) return [];
    const file = chain.files[chain.files.length - 1] ?? "AGENTS.md";
    return [
      {
        ruleId: this.id,
        severity: this.defaultSeverity,
        file,
        line: 1,
        message: `codex instruction chain is ${chain.totalBytes} bytes, over the ${budget}-byte budget; codex silently truncates the tail`,
        fixHint: "split instructions into nested AGENTS.md files or shrink the root file",
      },
    ];
  },
};
