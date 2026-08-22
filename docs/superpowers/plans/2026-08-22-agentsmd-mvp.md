# agentsmd v0.1 MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the agentsmd v0.1 CLI (`lint`, `doctor`, `sync`, `score`) and GitHub Action exactly per the approved spec.

**Architecture:** Pure core over an injected file-reader interface (tests run against in-memory fixture trees); per-tool target modules emulate vendor discovery behavior; rules are pure functions producing `Finding[]`; canonical JSON rendering with byte-identical determinism; zero runtime deps for the CLI.

**Tech Stack:** TypeScript 5.x strict, vitest, tsup/esbuild, Node >= 18, `@actions/core` (Action bundle only, inlined at build).

**Spec:** `docs/superpowers/specs/2026-08-22-agentsmd-mvp-design.md`

## Global Constraints

- Node `>=18`; `"type": "module"`; package name `agentsmd`; bin `agentsmd`.
- CLI has zero runtime dependencies; `@actions/core` appears only inside the committed Action bundle.
- TypeScript `strict: true`; no `any` in `src/`.
- Lint/score output: no timestamps, no absolute paths; JSON canonical (sorted keys); repeat runs byte-identical.
- Exit codes: 0 clean, 1 findings >= `fail-on` threshold (default `error`), 2 config error, 3 unexpected.
- Tests: vitest; every rule/target has fixture-tree tests; sync idempotency + text/JSON parity + determinism tests are release gates.
- MIT license. Commits conventional (`feat:`, `test:`, `chore:`, `docs:`).

## File Structure

```text
package.json  tsconfig.json  vitest.config.ts  LICENSE  README.md  action.yml
.github/workflows/ci.yml
src/
  cli.ts            # arg parsing, command dispatch, exit codes
  version.ts        # VERSION = "0.1.0-alpha.1"
  fs-types.ts       # FileReader interface + RealFs
  config.ts         # load/validate agentsmd.config.json
  discovery.ts      # repo root + RepoInventory
  markdown.ts       # parseMarkdown -> MarkdownDoc
  rules/
    types.ts        # Finding, Rule interfaces
    registry.ts     # rule registry + severity resolution
    dead-path.ts  dead-command.ts  budget.ts  claude-length.ts
    stub.ts  sprawl.ts  hygiene.ts   # todo/secret/absolute-path
  targets/
    types.ts        # TargetCheckResult
    codex.ts  claude.ts  gemini.ts  cursor.ts  copilot.ts
  wiring.ts         # doctor orchestration
  sync.ts           # stub create/repair/adopt, gemini merge, copilot copy
  score.ts          # score model v1
  report.ts         # text + JSON renderers (canonical JSON)
  canonical-json.ts # sorted-key serializer
  action/index.ts   # GitHub Action entry
schemas/score-report.schema.json
fixtures/           # golden repo trees (checked in, used by tests via MemFs)
test/               # unit + fixture + determinism + parity + process tests
```

---

### Task 1: Repo scaffold + CI + hello-bin

**Files:**
- Create: `package.json`, `tsconfig.json`, `vitest.config.ts`, `LICENSE`, `README.md`, `.github/workflows/ci.yml`, `src/cli.ts`, `src/version.ts`, `test/cli.test.ts`
- Modify: `.gitignore` (add `dist/`, keep existing)

**Interfaces:**
- Produces: `src/cli.ts` exports `runCli(argv: string[]): Promise<number>`; `src/version.ts` exports `const VERSION = "0.1.0-alpha.1"`.

- [x] **Step 1: Create config files**

`package.json`:

```json
{
  "name": "agentsmd",
  "version": "0.1.0-alpha.1",
  "description": "One source of truth for AI agent instructions — linted, wired, scored.",
  "license": "MIT",
  "type": "module",
  "engines": { "node": ">=18" },
  "bin": { "agentsmd": "dist/cli.js" },
  "files": ["dist", "schemas", "action.yml"],
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "test": "vitest run",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "verify": "npm run typecheck && npm run build && npm run test"
  },
  "devDependencies": {
    "typescript": "^5.9.3",
    "vitest": "^4.1.11",
    "@types/node": "^22.19.0"
  }
}
```

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "declaration": false,
    "sourceMap": false,
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

`vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
export default defineConfig({
  test: { include: ["test/**/*.test.ts"] },
});
```

`LICENSE`: MIT text, `Copyright (c) 2026 daichunghy`.

`.github/workflows/ci.yml`:

```yaml
name: CI
on:
  push: { branches: [main] }
  pull_request:
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npm run verify
```

`README.md` skeleton: `# agentsmd` + one-liner + `npx agentsmd doctor` + MIT badge placeholders (full README is Task 12).

- [x] **Step 2: Write failing CLI test**

`test/cli.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { runCli } from "../src/cli.js";

describe("cli", () => {
  it("prints version for --version and exits 0", async () => {
    const code = await runCli(["--version"]);
    expect(code).toBe(0);
  });
  it("exits 2 for unknown command", async () => {
    expect(await runCli(["frobnicate"])).toBe(2);
  });
});
```

- [x] **Step 3: Run test, expect failure** — `npx vitest run` fails: cannot import `../src/cli.js`.

- [x] **Step 4: Implement minimal CLI**

`src/version.ts`:

```ts
export const VERSION = "0.1.0-alpha.1";
```

`src/cli.ts` (prints to stdout; commands added by later tasks):

```ts
import { VERSION } from "./version.js";

export async function runCli(argv: string[]): Promise<number> {
  const cmd = argv[0];
  if (cmd === "--version" || cmd === "-v") {
    process.stdout.write(VERSION + "\n");
    return 0;
  }
  if (cmd === undefined || cmd === "--help" || cmd === "-h") {
    process.stdout.write("agentsmd — lint | doctor | sync | score\n");
    return 0;
  }
  process.stderr.write(`unknown command: ${cmd}\n`);
  return 2;
}
```

Plus `src/main.ts`: `import { runCli } from "./cli.js"; process.exitCode = await runCli(process.argv.slice(2));` and point `bin` at `dist/main.js`.

- [x] **Step 5: `npm install` then `npm run verify`** — expect PASS.
- [x] **Step 6: Commit** `git add -A && git commit -m "chore: scaffold agentsmd repo with CI"`

---

### Task 2: FileReader abstraction + Markdown parser

**Files:**
- Create: `src/fs-types.ts`, `src/markdown.ts`, `test/markdown.test.ts`
- Test: in-memory fixtures inline

**Interfaces:**
- Produces: `interface FileReader { readUtf8(path: string): string | undefined; exists(path: string): boolean; listDir(path: string): string[] | undefined; readBytes(path: string): Uint8Array | undefined; }` in `fs-types.ts`; `parseMarkdown(text: string): MarkdownDoc` where `MarkdownDoc = { lines: MdLine[] }`, `MdLine = { n: number; kind: "heading" | "fence" | "text" | "list" | "comment"; text: string }`.

- [x] **Step 1: Failing tests** — heading `# A` → kind heading; fenced block content lines kind fence; inline backticks preserved in `text`; HTML comments kind comment; blank → text.

```ts
import { describe, expect, it } from "vitest";
import { parseMarkdown } from "../src/markdown.js";

describe("parseMarkdown", () => {
  it("classifies heading, fence, comment, text", () => {
    const doc = parseMarkdown("# T\n\n<!-- c -->\n\n```sh\nnpm run x\n```\nplain `src/lib`");
    expect(doc.lines.map((l) => l.kind)).toEqual([
      "heading", "text", "comment", "text", "fence", "fence", "fence", "text",
    ]);
    expect(doc.lines[7]?.text).toContain("`src/lib`");
  });
});
```

- [x] **Step 2: Run, expect fail** (module missing).
- [x] **Step 3: Implement** — line loop; fence toggles on ``` pairs; heading `^#{1,6} `; comment `^\s*<!--`; everything else text.
- [x] **Step 4: `npm run verify` PASS.**
- [x] **Step 5: Commit** `feat: markdown mini-parser`

---

### Task 3: Discovery + config

**Files:**
- Create: `src/discovery.ts`, `src/config.ts`, `test/discovery.test.ts`

**Interfaces:**
- Produces: `findRepoRoot(fs: FileReader, cwd: string): string | undefined` (walks up for `.git` dir via `listDir`); `buildInventory(fs: FileReader, root: string): RepoInventory` with `RepoInventory = { root: string; agentsFiles: { rel: string; bytes: number }[]; overrides: string[]; claude: string | undefined; claudeDot: string | undefined; gemini: string | undefined; geminiSettings: string | undefined; copilotInstructions: string | undefined; cursorRules: string[]; config: ResolvedConfig }`; `loadConfig(fs: FileReader, root: string): ResolvedConfig` (defaults: `failOn: "error"`, budgets `{ codexChainBytes: 32768 }`, rule severity overrides map). Config parse failure → throw `ConfigError` (CLI maps to exit 2).

- [x] **Step 1: Failing tests** — MemFs tree: root has `.git`, `AGENTS.md`, `CLAUDE.md`, `.github/copilot-instructions.md`, `pkg/AGENTS.md` (nested); assert inventory fields and root detection from `pkg` cwd.
- [x] **Step 2: Run, expect fail.**
- [x] **Step 3: Implement** — `AGENTS.md` scan: root + one level of package dirs? No: recursive walk skipping `node_modules`/`.git`, collecting all `AGENTS.md` rel paths (spec §3 nested). Settings path `.gemini/settings.json`. `.cursor/rules/*.mdc` listing.
- [x] **Step 4: `npm run verify` PASS.**
- [x] **Step 5: Commit** `feat: repo discovery and config`

---

### Task 4: Rules engine + `lint` skeleton with dead-path & dead-command

**Files:**
- Create: `src/rules/types.ts`, `src/rules/registry.ts`, `src/rules/dead-path.ts`, `src/rules/dead-command.ts`, `src/report.ts`, `src/canonical-json.ts`, `test/rules-core.test.ts`
- Modify: `src/cli.ts` (add `lint`)

**Interfaces:**
- Produces: `type Severity = "error" | "warning"; type Finding = { ruleId: string; severity: Severity; file: string; line: number; message: string; fixHint: string }; type RuleContext = { fs: FileReader; inv: RepoInventory }; interface Rule { id: string; defaultSeverity: Severity; run(ctx: RuleContext): Finding[] }`; `renderText(findings: Finding[]): string`; `renderJson(findings: Finding[]): string` (canonical: `JSON.stringify(sortKeysDeep(findings))`); registry resolves configured severity (`"off"` drops the finding).

`dead-path`: for each instruction file line, extract backtick tokens; token is a candidate when it matches `^\.?/?[\w][\w\-./]*` and has no `://`, no spaces, no `*`; candidate exists check against `fs.exists(join(root, token))` (strip trailing `/`); missing → finding at that line.

`dead-command`: collect defined npm scripts from root `package.json` (`scripts` keys) + make targets from `Makefile` (`^[\w-]+:` lines); scan instruction files for `npm run <name>`, `npm <name>` (built-ins test/start allowed only if defined), `make <target>`; undefined → finding.

- [x] **Step 1: Failing tests** — MemFs tree with `AGENTS.md` referencing `` `src/missing` `` and `` `npm run build` `` with no `build` script; expect findings `dead-path`, `dead-command`, severities error, correct `line` numbers; `renderText`/`renderJson` parity (parse JSON back, deep-equal findings).
- [x] **Step 2: Run, expect fail.**
- [x] **Step 3: Implement all files** (`registry.runRules(ctx, rules, config)`; CLI `lint`: build ctx → run → render → exit code by `failOn`).
- [x] **Step 4: `npm run verify` PASS; hand-check CLI:** `node dist/main.js lint` inside a temp fixture dir.
- [x] **Step 5: Commit** `feat: rules engine with dead-path and dead-command`

---

### Task 5: Codex target + budget rule + claude-length

**Files:**
- Create: `src/targets/codex.ts`, `src/rules/budget.ts`, `src/rules/claude-length.ts`, `test/targets-codex.test.ts`
- Modify: registry wiring in `src/cli.ts` / a new `src/lint-all.ts` aggregator

**Interfaces:**
- Produces: `codexChain(fs: FileReader, inv: RepoInventory): { files: string[]; totalBytes: number }` — root→each dir on the direct path to cwd containing `AGENTS.override.md` or `AGENTS.md`, one file per dir (override wins); `budget` rule emits `codex-budget-overflow` when `totalBytes > cfg.budgets.codexChainBytes`; `claude-length-warn` counts non-marker non-blank lines of `CLAUDE.md` (>200 → warning at line 201).

- [x] **Step 1: Failing tests** — tree: root `AGENTS.md` (1000 bytes) + `pkg/AGENTS.md` (500 bytes), cwd `pkg` → chain 1500; override at `pkg/AGENTS.override.md` replaces `pkg/AGENTS.md`; overflow tree 33000 bytes → error finding.
- [x] **Step 2: expect fail → Step 3: implement → Step 4: verify PASS.**
- [x] **Step 5: Commit** `feat: codex chain emulation and budget rules`

---

### Task 6: Claude stub target + gemini target + doctor command

**Files:**
- Create: `src/targets/claude.ts`, `src/targets/gemini.ts`, `src/wiring.ts`, `test/wiring.test.ts`
- Modify: `src/cli.ts` (add `doctor`)

**Interfaces:**
- Produces: `claudeState(fs, inv): "absent" | "managed-intact" | "managed-broken" | "unmanaged"` (markers `<!-- agentsmd:begin:import -->` / `end:import` with `@AGENTS.md` between; `claude-only` markers optional); mapping to findings: `managed-broken` → `stub-broken` (error), `unmanaged` → `claude-unmanaged` (warning), others none. `geminiState(fs, inv): "absent" | "wired" | "unwired"` — target detected when `GEMINI.md` or `.gemini/settings.json` exists; `wired` when settings `context.fileName` array includes `AGENTS.md`; else `gemini-unwired` warning. `runDoctor(ctx): { findings: Finding[]; summary: string }` (also reports native targets: codex/cursor/copilot present-and-loaded lines).

- [x] **Step 1: Failing tests** — four claude states; gemini wired/unwired/absent; doctor summary string contains each detected tool and its state; parity text/json.
- [x] **Step 2–4: fail → implement → verify PASS.**
- [x] **Step 5: Commit** `feat: claude and gemini targets with doctor`

---

### Task 7: Hygiene rules (sprawl, todo-rot, secret-like, absolute-path)

**Files:**
- Create: `src/rules/sprawl.ts`, `src/rules/hygiene.ts`, `test/hygiene.test.ts`

**Interfaces:**
- Produces: `sprawl-duplicate` — normalize (lowercase; strip `` `*_#[]()>`` `` chars; collapse whitespace) root `AGENTS.md` vs each of `CLAUDE.md`/`GEMINI.md`/`.github/copilot-instructions.md` when present and NOT managed-stub (stubs exempt — their body is only markers + import); token-set Jaccard >= 0.7 → error finding `file: <other>, line: 1`. `todo-rot` (warning, any `TODO|FIXME` line), `secret-like` (error: `-----BEGIN .* PRIVATE KEY-----` or `(api_?key|secret|token)\s*[:=]\s*['"][A-Za-z0-9_\-]{16,}`), `absolute-path-portability` (warning: `` `/Users/` ``, `` `C:\`` tokens).

- [x] **Step 1: Failing tests** — GEMINI.md as near-copy of AGENTS.md (similarity 0.9) → error; managed stub exempt; managed copy with hash header exempt from sprawl but `stub-broken` if hash mismatched (hash = first 8 hex of sha256 body — implement `sha256Hex` in `src/canonical-json.ts` using `node:crypto`).
- [x] **Step 2–4: fail → implement → verify PASS.**
- [x] **Step 5: Commit** `feat: sprawl and hygiene rules`

---

### Task 8: Sync command (stub, adopt, gemini merge, copilot copy)

**Files:**
- Create: `src/sync.ts`, `test/sync.test.ts` (uses a `MemFs` with write support: extend FileReader with optional `writeUtf8`)
- Modify: `src/fs-types.ts` (`WriteReader extends FileReader { writeUtf8(path, content): void }`)

**Interfaces:**
- Produces: `runSync(fs: WriteReader, inv: RepoInventory, opts: { adopt: boolean; copilotCopy: boolean }): string[] /* changed paths */`. Stub create when `claude: absent`; repair import block when `managed-broken`; `--adopt` wraps unmanaged body into `claude-only` block (content preserved verbatim, import block prepended); without `--adopt` on unmanaged → no write, returns hint. Gemini: create/patch `.gemini/settings.json` merging `context.fileName` union (string widened to array; other keys untouched; file ends with `\n`). `--copilot-copy`: write `.github/copilot-instructions.md` with `<!-- agentsmd:managed sha256:<8hex> -->` header + AGENTS.md body. **Invariant test: second runSync returns `[]`.**

- [x] **Step 1: Failing tests** — create/repair/adopt/merge/idempotent/copilot-hash cases with exact expected file contents asserted.
- [x] **Step 2–4: fail → implement → verify PASS.**
- [x] **Step 5: Commit** `feat: sync with idempotent stub and config generation`

---

### Task 9: Score model + schema + canonical determinism

**Files:**
- Create: `src/score.ts`, `schemas/score-report.schema.json`, `test/score.test.ts`
- Modify: `src/cli.ts` (add `score`)

**Interfaces:**
- Produces: `computeScore(findings: Finding[], inv: RepoInventory, doc: MarkdownDoc): ScoreReport` per spec §8 (coverage 8/8/8/6 by normalized heading text among setup|install, build, test, style|conventions|architecture; freshness 30 − 10·errors − 3·warnings floor 0; wiring 25 with per-target deduction 8 per wiring error finding, `no wiring targets present` note; size thresholds 16/24/28 KiB). `ScoreReport = { schemaVersion: "1.0.0"; score: number; breakdown: Record<string, number>; notes: string[] }`. Determinism test: two `renderJson` runs byte-identical; parity: parse JSON deep-equals text table numbers.

- [x] **Step 1: Failing tests** — golden fixture: healthy single-tool repo scores exactly 100 (wiring note present); sprawl fixture loses freshness+wiring points deterministically; JSON validates against `schemas/score-report.schema.json` (hand-rolled validator: required keys + types, no ajv — zero-dep rule).
- [x] **Step 2–4: fail → implement → verify PASS.**
- [x] **Step 5: Commit** `feat: deterministic score model with versioned schema`

---

### Task 10: GitHub Action

**Files:**
- Create: `action.yml`, `src/action/index.ts`, `.github/workflows/action-test.yml`, `test/action.test.ts`
- Modify: `package.json` (devDeps `@actions/core`, `esbuild`, `tsx` or plain build script `build:action": "esbuild src/action/index.ts --bundle --platform=node --outfile=dist/action/index.js"`)

**Interfaces:**
- Consumes: `runDoctor`, `runRules`, `computeScore`, renderers.
- Produces: committed `dist/action/index.js` bundle. `action.yml`: inputs `fail-on` (default `error`), `config`, `badge-write` (default `false`); steps: checkout, setup-node, `npm ci || npm install`, run bundle. Emits `::error/::warning file=...,line=...` annotations; writes `score.json` artifact (actions/upload-artifact@v4); when `badge-write` and branch is default, commit `score.json` to `gh-pages` (uses peaceiris/actions-gh-pages or git commands — v0.1: git commands with the workflow token).

- [x] **Step 1: Failing test** — unit-test annotation formatting function `formatAnnotation(f: Finding): string` (e.g. `::error file=AGENTS.md,line=3::dead-path …`).
- [x] **Step 2–4: fail → implement → verify PASS → commit** `feat: github action with annotations and badge write`

---

### Task 11: Golden fixtures + determinism/parity/process release gates

**Files:**
- Create: `fixtures/{healthy-single-tool,sprawl,broken-stub,adopt,gemini-merge,budget-overflow,hygiene}/**` trees, `test/golden.test.ts`, `test/process.test.ts`
- Modify: README quickstart uses fixtures.

**Interfaces:**
- Consumes: all commands.
- Produces: `loadFixture(name): MemFs` helper in `test/helpers.ts`; golden snapshots of lint JSON + score for each fixture committed under `test/golden/`; process test: `npm pack` → `npx --prefix` run `--version` and `doctor` in a fixture copy.

- [x] **Step 1: Failing golden test** (assert snapshots exist and match).
- [x] **Step 2–4: fail → create trees/snapshots → verify PASS.**
- [x] **Step 5: Commit** `test: golden fixtures and release gates`

---

### Task 12: README v1 + topics + npm alpha publish + repo polish

**Files:**
- Modify: `README.md` (full), `package.json` (repository/keywords)
- Ops (manual/gh): create GitHub repo `daichunghy/agentsmd`, push, set 20 topics, enable Discussions, social preview, publish `npm publish --tag alpha`.

**Interfaces:** none (docs/ops).

- [x] **Step 1: README v1** — hero (asciinema placeholder until capture), badges (CI/npm/MIT), emoji sections Features→Quick Start→Usage, comparison table vs agents-lint/agent-sync/aicfg/@reaatech kit, wiring guides (Claude/Gemini/Copilot pages), roadmap, MIT.
- [x] **Step 2: `gh repo create daichunghy/agentsmd --public --source . --push`**; `gh repo edit --enable-discussions --description "..." --homepage ""`; topics list: `agents-md, claude-code, codex, gemini-cli, cursor, github-copilot, ai-agents, developer-tools, cli, linting, context-engineering, ai-coding-agents, agentsmd, agentic-ai, copilot, prompt-engineering, devtools, typescript, automation, code-review`.
- [x] **Step 3: `npm publish --tag alpha`** (requires `npm login` by maintainer if no token).
- [x] **Step 4: Commit** `docs: readme v1 and repo polish`

---

## Self-Review (run 2026-08-22)

1. **Spec coverage:** §4 modules → Tasks 2–9; §6 all 11 rules → Tasks 4,5,6,7 (dead-path, dead-command, codex-budget-overflow, claude-length-warn, stub-broken, claude-unmanaged, gemini-unwired, sprawl-duplicate, todo-rot, secret-like, absolute-path-portability — complete); §7 sync invariants → Task 8 (adopt/merge/idempotency/copilot-copy); §8 score → Task 9; §9 action/badge → Task 10; §10 testing → Tasks 1–11 each TDD + Task 11 golden/process; §11 ops → Tasks 1,12. Gap check: `init` is spec stretch-goal → intentionally deferred post-v0.1 (spec §2). None remaining.
2. **Placeholder scan:** asciinema placeholder in README is a content asset TODO bounded by launch, not a plan placeholder. No TBD/TODO steps.
3. **Type consistency:** `Finding` shape used identically in Tasks 4–10; `FileReader`/`WriteReader` consistent; `claudeState` string unions match between Task 6 (produce) and Task 8 (consume).
