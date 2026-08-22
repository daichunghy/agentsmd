import { parseMarkdown } from "../markdown.js";
import { joinRel, type Finding, type Rule } from "./types.js";

const TOKEN = /`([^`]+)`/g;
const CANDIDATE = /^\.?\/?[\w][\w\-./]*$/;
const KNOWN_EXT =
  /\.(md|json|ya?ml|toml|ts|tsx|js|jsx|mjs|cjs|py|rs|go|java|rb|sh|sql|txt|lock|cfg|ini|env|html|css|scss)$/i;

function looksLikePath(token: string): boolean {
  if (!CANDIDATE.test(token)) return false;
  if (token.includes("://") || token.includes("*")) return false;
  if (token.includes("/")) return true;
  if (token.startsWith(".")) return true;
  return KNOWN_EXT.test(token);
}

/** Backtick-quoted relative paths that do not exist on disk. */
export const deadPathRule: Rule = {
  id: "dead-path",
  defaultSeverity: "error",
  run(ctx) {
    const findings: Finding[] = [];
    for (const file of ctx.inv.instructionFiles) {
      const text = ctx.fs.readUtf8(joinRel(ctx.inv.root, file));
      if (text === undefined) continue;
      for (const line of parseMarkdown(text).lines) {
        if (line.kind === "comment") continue;
        TOKEN.lastIndex = 0;
        for (const m of line.text.matchAll(TOKEN)) {
          const token = m[1];
          if (token === undefined || !looksLikePath(token)) continue;
          const rel = token.replace(/\/+$/, "");
          if (!ctx.fs.exists(joinRel(ctx.inv.root, rel))) {
            findings.push({
              ruleId: this.id,
              severity: this.defaultSeverity,
              file,
              line: line.n,
              message: `path \`${rel}\` referenced in instructions does not exist`,
              fixHint: `remove or update the reference, or create ${rel}`,
            });
          }
        }
      }
    }
    return findings;
  },
};
