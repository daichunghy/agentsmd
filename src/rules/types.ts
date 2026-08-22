import type { FileReader } from "../fs-types.js";
import type { RepoInventory } from "../discovery.js";

export type RuleSeverity = "error" | "warning";

export interface Finding {
  ruleId: string;
  severity: RuleSeverity;
  file: string;
  line: number;
  message: string;
  fixHint: string;
}

export interface RuleContext {
  fs: FileReader;
  inv: RepoInventory;
}

export interface Rule {
  id: string;
  defaultSeverity: RuleSeverity;
  run(ctx: RuleContext): Finding[];
}

/** Join an inventory-relative path onto the repo root. */
export function joinRel(root: string, rel: string): string {
  return root === "" ? rel : `${root}/${rel}`;
}
