import { loadConfig, type ResolvedConfig } from "./config.js";
import type { FileReader } from "./fs-types.js";

export interface AgentsFileEntry {
  rel: string;
  bytes: number;
}

export interface RepoInventory {
  /** Repo root as a relative path from itself ("" for root itself). */
  root: string;
  /** Current working directory relative to root ("" when at root). */
  cwdRel: string;
  agentsFiles: AgentsFileEntry[];
  overrideFiles: string[];
  claude: string | undefined;
  claudeDot: string | undefined;
  gemini: string | undefined;
  geminiSettings: string | undefined;
  copilotInstructions: string | undefined;
  copilotPathInstructions: string[];
  cursorRules: string[];
  instructionFiles: string[];
  config: ResolvedConfig;
}

/** Walk up from cwd until a directory containing `.git` is found. */
export function findRepoRoot(fs: FileReader, cwd: string): string | undefined {
  const normalized = cwd.replace(/\\/g, "/");
  const parts = normalized === "" ? [] : normalized.split("/");
  for (let i = parts.length; i >= 0; i--) {
    const candidate = parts.slice(0, i).join("/");
    if (fs.exists(join(candidate, ".git"))) return candidate;
  }
  return undefined;
}

/** Skip at every depth. */
const SKIP_DIRS = new Set([".git", "node_modules", "dist", ".agentsmd-tmp"]);
/** Skip only when the directory is at the repository root. */
const SKIP_ROOT_DIRS = new Set(["fixtures", "coverage", "action-dist"]);

/** Build the full inventory of agent-instruction files for the repo. */
export function buildInventory(
  fs: FileReader,
  root: string,
  cwdRel: string,
): RepoInventory {
  const agentsFiles: AgentsFileEntry[] = [];
  const overrideFiles: string[] = [];
  const cursorRules: string[] = [];
  const copilotPathInstructions: string[] = [];
  const allFiles: string[] = [];
  walk(fs, root, "", allFiles);

  for (const rel of allFiles) {
    const base = rel.split("/").pop() ?? rel;
    const dir = rel.includes("/") ? rel.slice(0, rel.lastIndexOf("/")) : "";
    if (base === "AGENTS.md") {
      agentsFiles.push({ rel, bytes: fs.readBytes(join(root, rel))?.length ?? 0 });
    } else if (base === "AGENTS.override.md") {
      overrideFiles.push(rel);
    } else if (dir === ".cursor/rules" && base.endsWith(".mdc")) {
      cursorRules.push(rel);
    } else if (
      dir === ".github/instructions" &&
      base.endsWith(".instructions.md")
    ) {
      copilotPathInstructions.push(rel);
    }
  }
  agentsFiles.sort((a, b) => (a.rel < b.rel ? -1 : 1));
  overrideFiles.sort();
  cursorRules.sort();
  copilotPathInstructions.sort();

  const at = (rel: string): string | undefined =>
    allFiles.includes(rel) ? rel : undefined;

  const instructionFiles = [
    ...agentsFiles.map((a) => a.rel),
    ...(at("CLAUDE.md") ? [at("CLAUDE.md")!] : []),
    ...(at("GEMINI.md") ? [at("GEMINI.md")!] : []),
    ...(at(".claude/CLAUDE.md") ? [at(".claude/CLAUDE.md")!] : []),
    ...(at(".github/copilot-instructions.md")
      ? [at(".github/copilot-instructions.md")!]
      : []),
    ...copilotPathInstructions,
  ];

  return {
    root,
    cwdRel,
    agentsFiles,
    overrideFiles,
    claude: at("CLAUDE.md"),
    claudeDot: at(".claude/CLAUDE.md"),
    gemini: at("GEMINI.md"),
    geminiSettings: at(".gemini/settings.json"),
    copilotInstructions: at(".github/copilot-instructions.md"),
    copilotPathInstructions,
    cursorRules,
    instructionFiles,
    config: loadConfig(fs, root),
  };
}

function walk(
  fs: FileReader,
  root: string,
  dir: string,
  out: string[],
): void {
  const names = fs.listDir(join(root, dir));
  if (names === undefined) return;
  for (const name of names) {
    const rel = dir === "" ? name : `${dir}/${name}`;
    if (fs.listDir(join(root, rel)) !== undefined) {
      if (SKIP_DIRS.has(name)) continue;
      if (dir === "" && SKIP_ROOT_DIRS.has(name)) continue;
      walk(fs, root, rel, out);
    } else {
      out.push(rel);
    }
  }
}

function join(root: string, rel: string): string {
  return root === "" ? rel : `${root}/${rel}`;
}
