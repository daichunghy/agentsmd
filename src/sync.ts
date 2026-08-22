import { sha256Hex } from "./canonical-json.js";
import type { RepoInventory } from "./discovery.js";
import type { WriteReader } from "./fs-types.js";
import { joinRel } from "./rules/types.js";
import {
  CLAUDE_ONLY_BEGIN,
  CLAUDE_ONLY_END,
  IMPORT_BEGIN,
  IMPORT_END,
  claudeState,
} from "./targets/claude.js";

export interface SyncOptions {
  adopt: boolean;
  copilotCopy: boolean;
}

const IMPORT_BLOCK = `${IMPORT_BEGIN}\n@AGENTS.md\n${IMPORT_END}\n`;

function buildStub(claudeOnly: string | undefined): string {
  if (claudeOnly === undefined) return IMPORT_BLOCK;
  return `${IMPORT_BLOCK}\n${CLAUDE_ONLY_BEGIN}\n${claudeOnly}${CLAUDE_ONLY_END}\n`;
}

function extractClaudeOnly(text: string): string | undefined {
  const begin = text.indexOf(CLAUDE_ONLY_BEGIN);
  const end = text.indexOf(CLAUDE_ONLY_END);
  if (begin === -1 || end === -1 || end < begin) return undefined;
  return text.slice(begin + CLAUDE_ONLY_BEGIN.length, end);
}

function ensureTrailingNewline(text: string): string {
  return text.endsWith("\n") ? text : text + "\n";
}

/**
 * Generate and repair the minimal wiring artifacts. Never touches
 * AGENTS.md or .cursor/rules. Returns the changed paths; a clean repo
 * yields [] (idempotency invariant).
 */
export function runSync(
  fs: WriteReader,
  inv: RepoInventory,
  opts: SyncOptions,
): string[] {
  const changed: string[] = [];
  changed.push(...syncClaude(fs, inv, opts.adopt));
  changed.push(...syncGemini(fs, inv));
  if (opts.copilotCopy) changed.push(...syncCopilot(fs, inv));
  return changed;
}

function syncClaude(
  fs: WriteReader,
  inv: RepoInventory,
  adopt: boolean,
): string[] {
  const claude = fs.exists(joinRel(inv.root, "CLAUDE.md"))
    ? "CLAUDE.md"
    : fs.exists(joinRel(inv.root, ".claude/CLAUDE.md"))
      ? ".claude/CLAUDE.md"
      : undefined;
  if (claude === undefined) {
    fs.writeUtf8(joinRel(inv.root, "CLAUDE.md"), buildStub(undefined));
    return ["CLAUDE.md"];
  }
  const state = claudeState(fs, inv);
  const text = fs.readUtf8(joinRel(inv.root, claude)) ?? "";
  if (state === "managed-intact" || state === "absent") return [];
  if (state === "managed-broken") {
    const claudeOnly = extractClaudeOnly(text);
    fs.writeUtf8(
      joinRel(inv.root, claude),
      buildStub(claudeOnly === undefined ? undefined : ensureTrailingNewline(claudeOnly)),
    );
    return [claude];
  }
  // unmanaged
  if (!adopt) return [];
  const body = ensureTrailingNewline(text);
  fs.writeUtf8(joinRel(inv.root, claude), buildStub(body));
  return [claude];
}

function syncGemini(fs: WriteReader, inv: RepoInventory): string[] {
  if (inv.gemini === undefined && inv.geminiSettings === undefined) return [];
  const rel = ".gemini/settings.json";
  const path = joinRel(inv.root, rel);
  const text = fs.readUtf8(path);
  let settings: Record<string, unknown>;
  try {
    settings = text === undefined ? {} : (JSON.parse(text) as Record<string, unknown>);
  } catch {
    settings = {};
  }
  const context = (settings["context"] ?? {}) as Record<string, unknown>;
  const current = context["fileName"];
  const list =
    typeof current === "string"
      ? [current]
      : Array.isArray(current)
        ? [...current]
        : current === undefined
          ? ["GEMINI.md"]
          : [];
  const merged = [...list];
  if (!merged.includes("AGENTS.md")) merged.push("AGENTS.md");
  context["fileName"] = merged;
  settings["context"] = context;
  const next = JSON.stringify(settings, null, 2) + "\n";
  if (next === text) return [];
  fs.writeUtf8(path, next);
  return [rel];
}

function syncCopilot(fs: WriteReader, inv: RepoInventory): string[] {
  const agents = fs.readUtf8(joinRel(inv.root, "AGENTS.md"));
  if (agents === undefined) return [];
  const rel = ".github/copilot-instructions.md";
  const body = ensureTrailingNewline(agents);
  const next = `<!-- agentsmd:managed sha256:${sha256Hex(body).slice(0, 8)} -->\n${body}`;
  if (fs.readUtf8(joinRel(inv.root, rel)) === next) return [];
  fs.writeUtf8(joinRel(inv.root, rel), next);
  return [rel];
}
