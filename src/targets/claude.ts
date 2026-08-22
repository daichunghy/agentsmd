import type { FileReader } from "../fs-types.js";
import type { RepoInventory } from "../discovery.js";
import { joinRel, type Finding, type Rule } from "../rules/types.js";
import { copilotCopyState } from "./copilot.js";

export const IMPORT_BEGIN = "<!-- agentsmd:begin:import -->";
export const IMPORT_END = "<!-- agentsmd:end:import -->";
export const CLAUDE_ONLY_BEGIN = "<!-- agentsmd:begin:claude-only -->";
export const CLAUDE_ONLY_END = "<!-- agentsmd:end:claude-only -->";

export type ClaudeState =
  | "absent"
  | "managed-intact"
  | "managed-broken"
  | "unmanaged";

/**
 * Claude Code reads CLAUDE.md only. agentsmd keeps it as a managed stub
 * whose import block references @AGENTS.md; anything else is unmanaged
 * or broken.
 */
export function claudeState(fs: FileReader, inv: RepoInventory): ClaudeState {
  const claude = fs.exists(joinRel(inv.root, "CLAUDE.md"))
    ? "CLAUDE.md"
    : fs.exists(joinRel(inv.root, ".claude/CLAUDE.md"))
      ? ".claude/CLAUDE.md"
      : undefined;
  if (claude === undefined) return "absent";
  const text = fs.readUtf8(joinRel(inv.root, claude));
  if (text === undefined) return "absent";
  const begin = text.indexOf(IMPORT_BEGIN);
  const end = text.indexOf(IMPORT_END);
  if (begin === -1 || end === -1 || end < begin) return "unmanaged";
  const block = text.slice(begin + IMPORT_BEGIN.length, end);
  if (!block.split(/\r?\n/).some((l) => l.trim() === "@AGENTS.md")) {
    return "managed-broken";
  }
  return "managed-intact";
}

export function claudeFindings(fs: FileReader, inv: RepoInventory): Finding[] {
  const claude = inv.claude ?? inv.claudeDot;
  if (claude === undefined) return [];
  const state = claudeState(fs, inv);
  if (state === "managed-broken") {
    return [
      {
        ruleId: "stub-broken",
        severity: "error",
        file: claude,
        line: 1,
        message: "managed CLAUDE.md stub is missing or edited the @AGENTS.md import",
        fixHint: "run `agentsmd sync` to restore the import block",
      },
    ];
  }
  if (state === "unmanaged") {
    return [
      {
        ruleId: "claude-unmanaged",
        severity: "warning",
        file: claude,
        line: 1,
        message:
          "CLAUDE.md is not agentsmd-managed; Claude Code will not read AGENTS.md by itself",
        fixHint: "run `agentsmd sync --adopt` to wrap it as a managed stub",
      },
    ];
  }
  return [];
}

export const stubRule: Rule = {
  id: "stub-broken",
  defaultSeverity: "error",
  run(ctx) {
    const out = claudeFindings(ctx.fs, ctx.inv).filter(
      (f) => f.ruleId === "stub-broken",
    );
    if (copilotCopyState(ctx.fs, ctx.inv) === "managed-broken") {
      out.push({
        ruleId: this.id,
        severity: this.defaultSeverity,
        file: ctx.inv.copilotInstructions ?? ".github/copilot-instructions.md",
        line: 1,
        message: "managed Copilot copy was edited after generation (hash mismatch)",
        fixHint: "run `agentsmd sync --copilot-copy` to regenerate it",
      });
    }
    return out;
  },
};

export const claudeUnmanagedRule: Rule = {
  id: "claude-unmanaged",
  defaultSeverity: "warning",
  run(ctx) {
    return claudeFindings(ctx.fs, ctx.inv).filter(
      (f) => f.ruleId === "claude-unmanaged",
    );
  },
};
