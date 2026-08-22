import { parseMarkdown } from "../markdown.js";
import { joinRel, type Finding, type Rule } from "./types.js";

const LIMIT = 200;

/**
 * Claude Code loads CLAUDE.md in full on every session; Anthropic
 * recommends keeping it around 200 lines. Count non-blank,
 * non-comment (marker) lines.
 */
export const claudeLengthRule: Rule = {
  id: "claude-length-warn",
  defaultSeverity: "warning",
  run(ctx) {
    const claude = ctx.inv.claude ?? ctx.inv.claudeDot;
    if (claude === undefined) return [];
    const text = ctx.fs.readUtf8(joinRel(ctx.inv.root, claude));
    if (text === undefined) return [];
    const counted = parseMarkdown(text).lines.filter(
      (l) => l.kind !== "comment" && l.text.trim() !== "",
    );
    if (counted.length <= LIMIT) return [];
    return [
      {
        ruleId: this.id,
        severity: this.defaultSeverity,
        file: claude,
        line: LIMIT + 1,
        message: `CLAUDE.md has ${counted.length} non-marker lines; Claude recommends ~${LIMIT} to protect instruction adherence`,
        fixHint: "move detail into nested AGENTS.md files or linked docs and keep CLAUDE.md a thin stub",
      },
    ];
  },
};
