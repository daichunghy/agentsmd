import type { FileReader } from "../fs-types.js";
import type { RepoInventory } from "../discovery.js";
import { joinRel } from "../rules/types.js";

export interface CodexChain {
  /** Instruction files Codex would load, ordered root-first. */
  files: string[];
  totalBytes: number;
}

/**
 * Emulate Codex project-scope discovery: walk the directories from the
 * repo root down to the current working directory; in each directory
 * load `AGENTS.override.md` if present, else `AGENTS.md`; at most one
 * file per directory; concatenate root-down. (The user-global
 * ~/.codex/AGENTS.md file is outside repository scope.)
 */
export function codexChain(fs: FileReader, inv: RepoInventory): CodexChain {
  const dirs = [""];
  if (inv.cwdRel !== "") {
    const parts = inv.cwdRel.split("/");
    for (let i = 1; i <= parts.length; i++) {
      dirs.push(parts.slice(0, i).join("/"));
    }
  }
  const files: string[] = [];
  let totalBytes = 0;
  for (const dir of dirs) {
    const override = dir === "" ? "AGENTS.override.md" : `${dir}/AGENTS.override.md`;
    const agents = dir === "" ? "AGENTS.md" : `${dir}/AGENTS.md`;
    const pick = fs.exists(joinRel(inv.root, override))
      ? override
      : fs.exists(joinRel(inv.root, agents))
        ? agents
        : undefined;
    if (pick === undefined) continue;
    files.push(pick);
    totalBytes += fs.readBytes(joinRel(inv.root, pick))?.length ?? 0;
  }
  return { files, totalBytes };
}
