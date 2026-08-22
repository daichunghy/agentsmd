import type { Finding } from "./rules/types.js";
import { canonicalJson } from "./canonical-json.js";

/** Human-readable, deterministic text report. */
export function renderText(findings: Finding[]): string {
  if (findings.length === 0) return "agentsmd: no findings\n";
  const lines = findings.map(
    (f) =>
      `${f.file}:${f.line} ${f.severity} ${f.ruleId} — ${f.message} (fix: ${f.fixHint})`,
  );
  return lines.join("\n") + "\n";
}

/** Canonical JSON report (sorted keys, stable bytes). */
export function renderJson(findings: Finding[]): string {
  return canonicalJson(findings) + "\n";
}

/** Exit code per fail-on threshold: 1 when any finding meets it. */
export function exitCodeFor(
  findings: Finding[],
  failOn: "error" | "warning",
): number {
  const hit =
    failOn === "warning"
      ? findings.length > 0
      : findings.some((f) => f.severity === "error");
  return hit ? 1 : 0;
}
