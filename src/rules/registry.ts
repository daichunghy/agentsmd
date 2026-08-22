import type { Finding, Rule, RuleContext } from "./types.js";

/**
 * Run every rule, applying configured severity overrides ("off" drops the
 * rule). Returns findings sorted canonically (file, line, ruleId) so
 * output is deterministic.
 */
export function runRules(ctx: RuleContext, rules: Rule[]): Finding[] {
  const findings: Finding[] = [];
  for (const rule of rules) {
    const sev = ctx.inv.config.rules[rule.id] ?? rule.defaultSeverity;
    if (sev === "off") continue;
    for (const f of rule.run(ctx)) {
      findings.push({ ...f, severity: sev });
    }
  }
  findings.sort(
    (a, b) =>
      a.file < b.file ? -1 : a.file > b.file ? 1 : a.line - b.line || (a.ruleId < b.ruleId ? -1 : 1),
  );
  return findings;
}
