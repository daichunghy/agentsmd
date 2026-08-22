import type { WriteReader } from "./fs-types.js";

export interface InitOptions {
  force: boolean;
  config: boolean;
}

export interface InitResult {
  skipped: string[];
  wrote: string[];
}

/** Short generic starter; headings match the v1 coverage score model. */
export const STARTER_AGENTS_MD = `\
# AGENTS.md

Project instructions for AI coding agents. Keep this file the source of
truth; other tool-specific files should import or point here.

## Setup

Install dependencies with the package manager this repository already uses.

## Build

Run the documented build command.

## Test

Run the documented test command before considering a change complete.

## Conventions

Match existing style and tooling. Keep diffs scoped to the request. Do
not commit secrets or machine-specific paths.
`;

/** Valid `agentsmd.config.json` matching `ResolvedConfig` (no comments). */
export const EXAMPLE_CONFIG = `\
{
  "failOn": "error",
  "budgets": {
    "codexChainBytes": 32768
  },
  "rules": {},
  "ignore": []
}
`;

/**
 * Create a starter root AGENTS.md and optionally agentsmd.config.json.
 * Never writes CLAUDE.md, GEMINI.md, or Copilot instruction files.
 */
export function runInit(
  fs: WriteReader,
  root: string,
  opts: InitOptions,
): InitResult {
  const wrote: string[] = [];
  const skipped: string[] = [];
  maybeWrite(fs, root, "AGENTS.md", STARTER_AGENTS_MD, opts.force, wrote, skipped);
  if (opts.config) {
    maybeWrite(
      fs,
      root,
      "agentsmd.config.json",
      EXAMPLE_CONFIG,
      opts.force,
      wrote,
      skipped,
    );
  }
  wrote.sort();
  skipped.sort();
  return { skipped, wrote };
}

function maybeWrite(
  fs: WriteReader,
  root: string,
  rel: string,
  content: string,
  force: boolean,
  wrote: string[],
  skipped: string[],
): void {
  const path = join(root, rel);
  const exists = fs.readUtf8(path) !== undefined;
  if (exists && !force) {
    skipped.push(rel);
    return;
  }
  fs.writeUtf8(path, content);
  wrote.push(rel);
}

function join(root: string, rel: string): string {
  return root === "" ? rel : `${root}/${rel}`;
}
