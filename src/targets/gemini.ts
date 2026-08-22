import type { FileReader } from "../fs-types.js";
import type { RepoInventory } from "../discovery.js";
import { joinRel, type Finding, type Rule } from "../rules/types.js";

export type GeminiState = "absent" | "wired" | "unwired";

/**
 * Gemini CLI is detected when a GEMINI.md or .gemini/settings.json exists.
 * It is wired when settings context.fileName includes "AGENTS.md"
 * (string or array form).
 */
export function geminiState(fs: FileReader, inv: RepoInventory): GeminiState {
  const gemini = fs.exists(joinRel(inv.root, "GEMINI.md"));
  const settings = fs.exists(joinRel(inv.root, ".gemini/settings.json"))
    ? ".gemini/settings.json"
    : inv.geminiSettings;
  if (!gemini && settings === undefined) return "absent";
  if (settings === undefined) return "unwired";
  const text = fs.readUtf8(joinRel(inv.root, settings));
  if (text === undefined) return "unwired";
  try {
    const parsed = JSON.parse(text) as {
      context?: { fileName?: string | string[] };
    };
    const fileName = parsed.context?.fileName;
    const names = typeof fileName === "string" ? [fileName] : fileName;
    return names !== undefined && names.includes("AGENTS.md")
      ? "wired"
      : "unwired";
  } catch {
    return "unwired";
  }
}

export function geminiFindings(fs: FileReader, inv: RepoInventory): Finding[] {
  if (geminiState(fs, inv) !== "unwired") return [];
  return [
    {
      ruleId: "gemini-unwired",
      severity: "warning",
      file: ".gemini/settings.json",
      line: 1,
      message:
        "Gemini CLI detected but context.fileName does not include AGENTS.md",
      fixHint: "run `agentsmd sync` to add AGENTS.md to context.fileName",
    },
  ];
}

export const geminiUnwiredRule: Rule = {
  id: "gemini-unwired",
  defaultSeverity: "warning",
  run(ctx) {
    return geminiFindings(ctx.fs, ctx.inv);
  },
};
