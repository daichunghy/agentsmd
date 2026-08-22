import type { FileReader } from "../fs-types.js";
import type { RepoInventory } from "../discovery.js";
import { sha256Hex } from "../canonical-json.js";
import { joinRel } from "../rules/types.js";

/** Header line of an agentsmd-managed Copilot Chat copy. */
export const COPILOT_MANAGED_RE = /^<!-- agentsmd:managed sha256:([0-9a-f]{8}) -->$/;

export type CopilotCopyState =
  | "absent"
  | "native-only"
  | "managed-intact"
  | "managed-broken"
  | "unmanaged";

/**
 * Copilot cloud agent and code review read AGENTS.md natively. The
 * optional .github/copilot-instructions.md copy exists only for Copilot
 * Chat; agentsmd manages it with a content-hash header when enabled.
 */
export function copilotCopyState(
  fs: FileReader,
  inv: RepoInventory,
): CopilotCopyState {
  const rel = inv.copilotInstructions;
  if (rel === undefined) return "absent";
  const text = fs.readUtf8(joinRel(inv.root, rel));
  if (text === undefined) return "absent";
  const lines = text.split(/\r?\n/);
  const first = lines[0] ?? "";
  const m = COPILOT_MANAGED_RE.exec(first);
  if (!m) return "unmanaged";
  const body = lines.slice(1).join("\n");
  const expected = sha256Hex(body).slice(0, 8);
  return m[1] === expected ? "managed-intact" : "managed-broken";
}
