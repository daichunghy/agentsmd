# Independent improvement audit — agentsmd

**Superseded in part:** later commits on local `main` added community files,
dropped the npm badge, pinned the Action to `@main`, and skipped root
`fixtures/`. Keep this file as the day-0 snapshot; do not treat its
“missing community files / `@v0`” rows as the current tree.

**Date:** 2026-08-22  
**Scope:** `/Users/macos/Desktop/agentsmd` vs spec `docs/superpowers/specs/2026-08-22-agentsmd-mvp-design.md` and GTM `docs/launch/2026-08-22-gtm-strategy.md`  
**Method:** read `src/`, `test/`, `action.yml`, `package.json`, fixtures, GitHub API, npm registry. No invented files.  
**Purpose:** (1) make this a trustworthy npx-installable OSS product; (2) strengthen an *honest* Codex for Open Source application later. There is no official 1000-star cutoff. Do not fake stars or users.

---

## A. Current honest OSS / application posture

### What is already real (do not oversell)

| Fact | Evidence |
| --- | --- |
| Public MIT repo | `https://github.com/daichunghy/agentsmd`, `LICENSE` copyright 2026 daichunghy |
| Created today | GitHub `created_at` 2026-08-22T07:22:28Z; 15 conventional commits from spec → README |
| Description + 20 topics + Discussions on | GitHub API: 20 lowercase-hyphenated topics matching GTM list; `has_discussions: true` |
| CI green | `.github/workflows/ci.yml` (`npm run verify`); 2/2 runs **success** on `ubuntu-latest` / Node 22 |
| v0.1 command surface exists | `src/cli.ts`: `lint`, `doctor`, `sync`, `score` + `--version` / `--help` |
| 11 lint rules implemented | `src/lint.ts` `ACTIVE_RULES` matches spec §6 ids |
| Golden + determinism tests | 7 fixtures under `fixtures/`; `test/golden/*.json`; 66 `it()` blocks + 7 golden cases ≈ 72 tests |
| Action bundle committed | `action.yml` → `action-dist/index.js` (esbuild bundle of `@actions/core`) |
| Zero CLI runtime deps | `package.json` `dependencies` absent; `@actions/core` is `devDependency` only |
| TypeScript strict, no `any` in `src/` | `tsconfig.json` `strict` + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes`; grep of `src/` found no `any` type |
| Version | `0.1.0-alpha.1` (`package.json`, `src/version.ts`) |

### What an honest application cannot claim today

| Claim | Reality (fetched 2026-08-22) |
| --- | --- |
| Repository usage | **0 stars, 0 forks, 0 watchers, 0 issues, 0 PRs, 0 releases, 0 tags** |
| npm install / `npx agentsmd` from registry | `https://registry.npmjs.org/agentsmd` → **Not found**. README npm badge will 404 |
| GitHub Action Marketplace | Marketplace search for `agentsmd` → **0 results**. README tells users `uses: daichunghy/agentsmd@v0` but **no `v0` tag exists** |
| GitHub community health | API `health_percentage: **42**`. Present: README + LICENSE. Missing: CoC, CONTRIBUTING, issue template, PR template (and SECURITY is not in that score but also missing) |
| GitHub Pages / badge endpoint | `has_pages: false`. `badge-write` never proven on this repo |
| External contributors | Solo maintainer (`daichunghy`). Account: 3 public repos, 0 followers |
| Ecosystem importance | Spec's own competitive set is tiny (`agents-lint` 13★, `agent-sync` 5★). agentsmd is earlier than all of them in *calendar age* (hours, not months) |
| Self-hosting the product | Running the Action on this repo wrote `agentsmd-out/score.json` = **score 70** with **14 lint errors + 2 warnings**, because discovery walks `fixtures/` (see D) |

GTM Phase 3 application gate (300+ stars, 100+ badge repos, ≥1 external PR, zero honesty violations) is **not met**. That is expected on day 0. The honest story for later: *instruction lane (agentsmd) + enforcement lane (PatchGate), one maintainer, one thesis* — only after usage exists.

**What reviewers would credit today:** a complete, tested v0.1 core shipped in one day with conventional commits, green CI, MIT, and a clear non-goal boundary (no PatchGate-style enforcement).  
**What they would ding:** unpublished npm package, broken Action pin, 42% community health, no SECURITY, no CHANGELOG, no issue path, dogfood score polluted by fixtures, first-run CLI that cannot mkdir or explain `--adopt`.

---

## B. Missing GitHub community-health files

Inventory of `.github/` as it exists:

```
.github/
  workflows/
    ci.yml          # only workflow
```

GitHub contents API on `main` confirms `.github` contains **only** `workflows/`. No other community files exist at repo root either.

| File / surface | Status | Why it matters |
| --- | --- | --- |
| `README.md` | **Present** | Product page |
| `LICENSE` | **Present** (MIT) | |
| `AGENTS.md` | **Present** (dogfood source) | Not a GitHub health file, but good |
| `.github/workflows/ci.yml` | **Present** | Green |
| `CODE_OF_CONDUCT.md` or `.github/CODE_OF_CONDUCT.md` | **Missing** | Health score; Contributor Covenant is the expected default |
| `CONTRIBUTING.md` or `.github/CONTRIBUTING.md` | **Missing** | README “Contributing” is three sentences (`npm run verify` + MIT) |
| `SECURITY.md` | **Missing** | Required for any tool that scans for `secret-like`; tells people where to report keys found in AGENTS.md |
| `SUPPORT.md` | **Missing** | Redirect to Discussions (already enabled) vs Issues |
| `.github/ISSUE_TEMPLATE/` (bug / feature / config YAML) | **Missing** | GTM: “issue forms + 3 good-first-issues at launch”. Issues exist as a feature (`has_issues: true`) but **0 issues** and no forms |
| `.github/PULL_REQUEST_TEMPLATE.md` | **Missing** | Ask for `npm run verify`, no `any`, no CLAUDE.md content copy |
| `.github/CODEOWNERS` | **Missing** | `@daichunghy` on `*` |
| `.github/dependabot.yml` | **Missing** | npm + github-actions; active-maintenance signal |
| Release / publish workflow | **Missing** | No tags, no npm publish automation |
| `action-test.yml` | **Missing** | Implementation plan Task 10 listed it; never created |
| Weekly-rot example workflow | **Missing** | Spec §9: “documented (not auto-generated) weekly cron” |
| Social preview image | **Missing** (ops) | GTM Phase 0 |
| Default labels only | GitHub defaults (`bug`, `good first issue`, …) | No `rule`, `docs`, `good-first-issue` *issues* to attach them to |

`.gitignore` exists (`node_modules/`, `dist/`, `*.log`, `.DS_Store`, `coverage/`) but does **not** ignore `*.tgz` or `agentsmd-out/`. Both are **committed on `main`**:

- `agentsmd-0.1.0-alpha.1.tgz` (process-test leftover)
- `agentsmd-out/score.json` (Action local output)

That is the opposite of a clean product repo.

---

## C. Missing product features that would make first-run real

### Exists vs missing (first-run path)

**Intended first run (README):**

```sh
npx agentsmd doctor
```

| Step | Status |
| --- | --- |
| Name reserved on npm | **Not published** (`registry.npmjs.org/agentsmd` 404). `npx agentsmd` from a clean machine **fails today** |
| `bin` | `package.json` `"agentsmd": "dist/main.js"` |
| Shebang | **Missing.** `src/main.ts` has no `#!/usr/bin/env node`. Grep of the repo found zero shebang lines. npm will not make a working CLI without it |
| `files` | `dist`, `schemas`, `action.yml` — does **not** include `action-dist/` (OK for GH Action, which checks out the repo) |
| `dist/` gitignored | Yes. Publish **must** `npm run build` first. No `prepublishOnly`, no release workflow |
| `init` scaffolder | **Absent** (roadmap: v0.2). README has no “create AGENTS.md” path; doctor on a repo without `.git` prints `not inside a git repository` and exits 2 |
| `agentsmd.config.json` example | **Absent.** Config loader exists (`src/config.ts`) but no example file, no README snippet of the JSON shape |
| `--help` | One line: `agentsmd — lint \| doctor \| sync \| score\n`. No flags (`--json`, `--adopt`, `--copilot-copy`), no exit codes |
| `sync` UX when unmanaged | Spec §7: refuse **and instruct** `sync --adopt`. Implementation returns `[]`; CLI prints `agentsmd: nothing to change` (`src/cli.ts` + `src/sync.ts`) — **wrong message** |
| `sync` parent dirs | `RealFs.writeUtf8` is `writeFileSync` with **no `mkdir`**. `syncGemini` writes `.gemini/settings.json` and `syncCopilot` writes `.github/copilot-instructions.md`. MemFs tests pass; **real FS throws ENOENT** if the parent directory is missing |
| GitHub Action usage doc | README has a 6-line YAML pin to **non-existent `@v0`**. No `config` input (spec §9). No weekly cron snippet. No shields.io endpoint snippet. No Marketplace listing |
| `CHANGELOG.md` | **Missing.** GTM Phase 2: “release notes = weekly content” |
| npm metadata | Has `repository`, `bugs`, `homepage`, 11 keywords. **No** `author`, `publishConfig` (`tag: alpha`), `exports`/`main` |
| Dogfood config | This repo has **no** `agentsmd.config.json`, so lint walks `fixtures/**` and treats example trees as production instruction files |

### README vs GTM Phase 0 checklist

Present: one-liner in the first screen, CI/npm/MIT badges, emoji Features → Quick Start, comparison table, wiring table, roadmap.

Missing vs GTM §2.1:

- Hero demo (asciinema / ≤15s GIF)
- Per-tool wiring **pages** (Claude / Gemini / Copilot) — only a table
- PatchGate cross-link (spec §15: “agentsmd README references PatchGate for merge-gating”) — **zero mentions in `README.md`**
- Honest limitation line (Windows untested, registry not built, alpha)
- `--json` / config / Action inputs documented completely
- “New:” announcement block

---

## D. Code-level gaps vs the design spec

### D.1 Module map (spec §4 vs tree)

| Spec path | Actual | Gap |
| --- | --- | --- |
| `src/cli.ts` | Present | Thin; no `--fail-on`, `--config`, `--report`, `--cwd`; score always exit 0 |
| `src/config.ts` | Present | `failOn` is `"error" \| "warning"` only — Action supports `"never"`; no `config` path override; no ignore globs |
| `src/discovery.ts` | Present | Walks entire tree; skip set is `.git`, `node_modules`, `dist`, `.agentsmd-tmp` only. **Does not skip `fixtures/`, `test/`, `docs/`** |
| `src/markdown.ts` (not `markdown/`) | Present | Line classifier only; spec mentioned links — unused, acceptable |
| `src/targets/codex.ts` | Present | Root→cwd chain + override. **No** `project_doc_fallback_filenames` (spec §3) |
| `src/targets/claude.ts` | Present | Four states + findings. Plan’s `rules/stub.ts` folded here |
| `src/targets/gemini.ts` | Present | Detect + `context.fileName` includes `AGENTS.md` |
| `src/targets/cursor.ts` | **Missing file** | Cursor is a one-liner in `src/wiring.ts` (`native AGENTS.md — present/missing`). Inventory collects `.cursor/rules/*.mdc` but doctor never reports them |
| `src/targets/copilot.ts` | Present | Hash-managed copy state. `native-only` / `unmanaged` states unused by doctor except hash-mismatch → `stub-broken` |
| `src/rules/*` | 11 rules | All spec §6 ids present. `sprawl.ts` **skips all CLAUDE.md** (`if (file === "AGENTS.md" \|\| file === claude) continue`) — spec says compare CLAUDE.md too; unmanaged duplicates are never `sprawl-duplicate` |
| `src/wiring.ts` | Present | Doctor = summary lines + claude/gemini findings only. Does **not** merge full lint set (spec data flow: “doctor merges wiring findings” — OK if interpreted narrowly) |
| `src/score.ts` | Present | Coverage / freshness / wiring / size match §8. Schema `1.0.0` |
| `src/report.ts` | Present | Text + canonical JSON. Exit 0/1 only (no 3 for internals) |
| `src/sync.ts` | Present | Stub create/repair/adopt, Gemini union, copilot copy, idempotency tested **on MemFs** |
| `src/action/index.ts` | Present | Annotations + `agentsmd-out/score.json` + optional **orphan `gh-pages --force`**. No artifact upload action; no `config` input |
| `schemas/score-report.schema.json` | Present | Matches `ScoreReport` |
| `fixtures/` 7 trees | Present | Spec §10 items 1–6 + hygiene combo. Nested budget chain is a **single huge root file**, not a nested chain |
| `test/process.test.ts` | Present | Packs tarball then **leaves `agentsmd-*.tgz` in the working tree** (now on GitHub) |

### D.2 Spec §5 determinism / CLI contract

| Requirement | Status |
| --- | --- |
| No timestamps / absolute paths in lint+score JSON | Held in renderers; `dead-path` **does** emit absolute paths when the token is absolute (`test/golden/hygiene.json` message contains `/Users/x/y.log`) |
| Canonical JSON, repeat-run byte-identical | Tested (`test/golden.test.ts`, `test/score.test.ts`) |
| Exit 0 / 1 / 2 / 3 | 0 and 1 for lint/doctor; 2 for unknown cmd / no git / `ConfigError`; **3 never used**. Uncaught throws become Node’s default |
| `score` respects `fail-on` | **No** — `scoreCommand` always `return 0` |
| `score --report` (spec §9 Action) | **No such flag.** CLI has `--json` only. Action writes a file itself |
| Text/JSON parity | Tested for findings; score text contains the JSON numbers |

### D.3 Spec §6 rules — behavioral holes

- **`dead-path`:** only backtick tokens, not “fenced relative repo paths” (spec wording). Also flags absolute backtick paths (double-hits with `absolute-path-portability` in hygiene golden).
- **`dead-command`:** root `package.json` + root `Makefile` only; ignores workspace packages.
- **`todo-rot`:** any TODO/FIXME (spec’s v0.1 simplification) — OK.
- **`secret-like`:** private-key block + assignment regex — OK; hygiene fixture uses `token: "abcdefghij0123456789"`.
- **`sprawl-duplicate`:** skips CLAUDE.md entirely; spec wants Jaccard vs CLAUDE.md / GEMINI.md / copilot file, with **managed stubs exempt** (exemption is implemented; skip-all is too broad).
- **`stub-broken`:** also covers copilot hash mismatch — matches spec §7.

### D.4 Spec §7 sync

| Invariant | Status |
| --- | --- |
| Never modify `AGENTS.md` | Held |
| Never modify `.cursor/rules` | Held |
| Create stub when no CLAUDE.md | Held (always, even single-tool — spec-correct, surprising for Codex-only users) |
| Unmanaged → refuse + tell user `--adopt` | Refuse yes; **message no** |
| Repair import; preserve claude-only | Tested |
| Gemini union, widen string→array, keep other keys | Tested |
| Copilot copy only with `--copilot-copy` | Tested |
| Idempotent second run | Tested on MemFs |
| `mkdir` for `.gemini/` / `.github/` | **Not implemented on RealFs** |

### D.5 Spec §8 score

Implemented and golden-locked. Healthy fixture scores **100** with note `wiring: no wiring targets present`. Wiring deductions: −8 error / −4 warning per wiring rule (`stub-broken`, `claude-unmanaged`, `gemini-unwired`, `sprawl-duplicate`). Spec text said “−8 per wiring error finding”; warnings were unspecified — code chose −4.

Coverage headings are regex on title (`setup|install`, `build`, `test`, `style|convention|architect`) — not a configurable set yet (spec: “configurable set”).

### D.6 Spec §9 Action

| Spec | Actual `action.yml` / `src/action/index.ts` |
| --- | --- |
| Input `fail-on` error\|warning\|never | Present |
| Input `config` | **Missing** |
| Input `badge-write` | Present (string `"false"`) |
| `::error` / `::warning` annotations | `formatAnnotation` tested |
| Upload score JSON as artifact | Writes `agentsmd-out/score.json` and sets output `report`; **does not** call `upload-artifact` |
| `badge-write` on default branch → `gh-pages` `score.json` | `git checkout --orphan gh-pages` then `git rm -rf` then **`--force` push**. Wipes any existing Pages site. Default-branch detect is `ref.endsWith("/main") \|\| "/master"` not `GITHUB_DEFAULT_BRANCH` |
| Documented weekly cron | Not in repo |

Action tests only format strings + `actionEvaluate(cwd, "never")` on **this** workspace (so they currently assert “does not crash” while the repo has 14 fixture-driven errors).

### D.7 Spec §10 testing holes

Present: 7 golden trees, determinism, text/JSON parity, packed `--version`, doctor in a temp git copy.

Missing or weak:

- Process test does not run `lint`/`sync` from the tarball against a fixture (only `--version` from pack + `doctor` from **local `dist/`**).
- No Windows CI (GTM’s named limitation — still true). `findRepoRoot` splits on `/` only (`src/discovery.ts`) — will mis-walk `C:\...` cwd.
- Plan file `.github/workflows/action-test.yml` never added.
- `sync` never tested against `RealFs` (the mkdir bug is uncaught).
- `cursor.ts` vendor-matrix tests: none.
- No test that unmanaged `sync` prints the adopt hint (because it doesn’t).

### D.8 `package.json` / Action packaging

```json
"files": ["dist", "schemas", "action.yml"],
"bin": { "agentsmd": "dist/main.js" }
```

`tsc` emits `dist/action/index.js` **unbundled** (`import * as core from "@actions/core"`). That file would ship on npm even though the CLI does not need it, and it cannot run without a runtime dep the package claims not to have. The real Action entry is `action-dist/index.js` (outside `files`, correct for GH).

`build:action` outfile is `action-dist/index.js`; plan said `dist/action/index.js`. Current split is fine if documented.

---

## E. Feature proposals (ranked)

Legend: **user value** = first-run / trust; **Codex-application value** = honest signals reviewers actually look at (usage, maintenance, ecosystem), not vanity metrics.

### P0 — implement this session

#### P0.1 Make `npx` / sync work on a real disk

- **User value:** Without shebang + mkdir, the published CLI is not a product.
- **Codex-application value:** “installable via npx” is a usage prerequisite, not a star count.
- **Files:** `src/main.ts` (shebang), `src/fs-types.ts` (`mkdirSync` recursive before write), `test/sync.test.ts` or a small RealFs test, `package.json` (`prepublishOnly`, `publishConfig.tag=alpha`, `author`), `.gitignore` (`*.tgz`, `agentsmd-out/`), delete committed tarball + `agentsmd-out/`, fix `test/process.test.ts` to pack in a temp dir.
- **Risk:** Low. Determinism untouched.

#### P0.2 Stop dogfooding fixtures as production AGENTS.md

- **User value:** `agentsmd lint` on *this* repo (and any repo with examples) is currently lying. `agentsmd-out/score.json` shows 14 errors from `fixtures/`.
- **Codex-application value:** A green, explainable self-score is the only badge you can show on day 0 without inventing users.
- **Files:** `src/config.ts` (optional `ignore: string[]`), `src/discovery.ts` (honor ignore; default skip nothing extra except maybe document it), `agentsmd.config.json` in this repo ignoring `fixtures/**`, golden tests for ignore, README snippet.
- **Risk:** Medium — must not change fixture goldens; ignore is config-only. Keep output deterministic (sorted paths).

#### P0.3 CLI honesty: help, adopt hint, fail-on, score JSON path

- **User value:** First `--help` should teach `lint|doctor|sync|score`, `--json`, `--adopt`, `--copilot-copy`, `--fail-on`, exit codes.
- **Codex-application value:** Looks like a finished CLI, not a scaffold.
- **Files:** `src/cli.ts`, `src/sync.ts` (return a reason / print hint when unmanaged and `!adopt`), `src/report.ts` (optional `never` to match Action), `test/cli.test.ts`.
- **Risk:** Low. Do not change finding JSON shape.

#### P0.4 Community-health + trust files (no fake activity)

- **User value:** How to contribute, how to report a secret, how to file a bug.
- **Codex-application value:** GitHub health 42% → ~75%+ is a real maintenance signal. SECURITY.md is mandatory for a secret-scanner.
- **Files (create):**  
  `CODE_OF_CONDUCT.md` (Contributor Covenant 2.1),  
  `CONTRIBUTING.md`,  
  `SECURITY.md`,  
  `SUPPORT.md`,  
  `.github/ISSUE_TEMPLATE/bug.yml` + `feature.yml` + `config.yml`,  
  `.github/PULL_REQUEST_TEMPLATE.md`,  
  `.github/CODEOWNERS`,  
  `.github/dependabot.yml`,  
  `CHANGELOG.md` (Keep a Changelog; Unreleased + 0.1.0-alpha.1).
- **Risk:** None to runtime. Do **not** open sock-puppet issues.

#### P0.5 Action that can actually be copied

- **User value:** README pin must resolve; weekly cron must be pasteable; `config` input as spec §9; do not force-push an orphan branch by default.
- **Codex-application value:** Marketplace-ready Action is a discovery surface (GTM). A working self-check workflow is “active maintenance”.
- **Files:** `action.yml` (`config` input), `src/action/index.ts` (read config path; safer badge-write — write `score.json` without `git rm -rf` / consider documenting a *separate* workflow), `docs` or README Action section + weekly cron example (e.g. `docs/examples/weekly-rot.yml` **or** `.github/workflows/weekly-example.md` as copy-paste, not necessarily enabled), README pin to `@main` until a real tag exists. **Do not invent `@v0`.**
- **Risk:** Medium for badge-write rewrite — keep default `badge-write: false`.

#### P0.6 README first-run completeness (still no GIF required)

- **User value:** config example, `npx` caveats (alpha, not on npm until published), PatchGate one-liner (instruction vs enforcement), Windows untested, Action `@main`, ignore fixtures.
- **Codex-application value:** Honest README is the anti-goal of GTM (“no official-standard claims”).
- **Files:** `README.md`, `agentsmd.config.json.example`.
- **Risk:** None.

**Out of P0 this session:** full `init` scaffolder (roadmap v0.2), registry/leaderboard, Marketplace publish (needs a tag + org verification), actual `npm publish` (needs maintainer token — *prepare* the package, don’t fake downloads), Cursor rules migration, MCP.

### P1 — next, still v0.1 polish

| ID | Proposal | User value | Codex-application value | Files | Risk |
| --- | --- | --- | --- | --- | --- |
| P1.1 | `src/targets/cursor.ts` reporting nested AGENTS.md + `.cursor/rules` count (read-only) | Doctor tells Cursor users what will load | Completes spec §4 vendor matrix | `src/targets/cursor.ts`, `src/wiring.ts`, `test/wiring.test.ts` | Low |
| P1.2 | Sprawl: compare unmanaged CLAUDE.md (keep stub exemption) | Catches the actual sprawl case | Spec §6 fidelity | `src/rules/sprawl.ts`, goldens if fixtures change | Medium (golden churn) |
| P1.3 | Release workflow: `npm publish --tag alpha` on tag `v*` + GitHub Release + CHANGELOG excerpt | Installable without tribal knowledge | Release history = maintenance evidence | `.github/workflows/release.yml`, `package.json` | Medium (secrets) |
| P1.4 | 2–3 **real** `good first issue` tickets (e.g. Windows path join, `pnpm`/`yarn` script detection, ignore glob) | External PR path | GTM + application gate “≥1 external PR” | GitHub issues, not code | Low — only if the work is real |
| P1.5 | Exclude `dist/action` from npm `files` or stop compiling Action via `tsc` | Clean zero-dep tarball | Trust | `tsconfig.json` exclude, `package.json` files | Low |
| P1.6 | `score` exit codes + `--report <path>` | Matches spec §9; CI one-liners | | `src/cli.ts` | Low |
| P1.7 | Self-hosted Action workflow on this repo (`fail-on: never` until ignore lands) | Dogfood | Badge later | `.github/workflows/agentsmd.yml` | Low |

### P2 — v0.2 / launch week, not this session

| ID | Proposal | Notes |
| --- | --- | --- |
| P2.1 | `agentsmd init` scaffolder | Spec stretch / roadmap v0.2. Thin AGENTS.md template + optional stub. Do not duplicate content into CLAUDE.md |
| P2.2 | Registry + leaderboard | Spec §2 non-goal for v0.1 |
| P2.3 | Hero GIF / asciinema | GTM launch asset |
| P2.4 | Marketplace publish + `v0` / `v0.1.0-alpha.1` tags | After npm publish |
| P2.5 | Windows CI matrix | Named limitation; `path.posix` vs `path.win32` in discovery |
| P2.6 | Configurable coverage heading set | Spec §8 |
| P2.7 | Codex fallback filenames | Spec §3 |
| P2.8 | dead-path on fenced paths | Spec §6 wording |
| P2.9 | Social preview image, homepage URL | Ops |

---

## F. Suggested PR-sized slices for this session (max 6)

A coding agent can land these **without waiting** for npm tokens, Marketplace approval, or users.

1. **`fix: shebang, mkdir-p, pack leftovers`**  
   `src/main.ts`, `src/fs-types.ts`, `.gitignore`, delete `agentsmd-0.1.0-alpha.1.tgz` and `agentsmd-out/`, `test/process.test.ts` packs in tmp. Add a RealFs sync test that creates `.gemini/settings.json` in an empty parent.

2. **`feat: config ignore globs so fixtures are not production instructions`**  
   `ignore` in `agentsmd.config.json`; skip those prefixes in `walk()`. Add `agentsmd.config.json` here with `"ignore": ["fixtures/**"]`. Tests in `test/discovery.test.ts`. Do not change fixture goldens.

3. **`feat: CLI help, adopt hint, --fail-on / --json documented in help`**  
   When `sync` sees unmanaged and `!adopt`, print the spec hint to stderr and exit 0 (or 1 — pick one and test). Expand `--help`. Score `--json` already exists; mention it.

4. **`docs: community health + CHANGELOG + config example`**  
   The P0.4 file set + `agentsmd.config.json.example` + README: PatchGate one-liner, Action `@main`, “not on npm until 0.1.0-alpha is published”, Windows untested, no official AGENTS.md claim.

5. **`feat: Action config input + copy-paste weekly workflow + safer README pin`**  
   `action.yml` `config`; README weekly cron; **do not** enable a destructive `badge-write` on this repo. Optional: document `permissions: contents: write` only if badge-write is used.

6. **`chore: package.json publish metadata`**  
   `author`, `publishConfig: { "tag": "alpha" }`, `prepublishOnly: npm run verify`, stop shipping unbundled `dist/action` (exclude from `tsconfig` or `files`). No actual publish in this PR unless the maintainer runs it.

Do **not** combine 4 with 1 if review bandwidth is tight; 1–3 are the product-correctness cluster, 4–6 the trust cluster.

---

## G. Non-goals

Binding for this improvement pass (and for the coding agent that follows):

- **No PatchGate-style enforcement.** No merge gating, no “block the PR until instructions are perfect” beyond existing `fail-on` lint exit codes. Cross-link only.
- **Do not duplicate AGENTS.md content into CLAUDE.md.** Sync stays stub + markers + Gemini union + optional hashed Copilot copy.
- **No `init` scaffolder in v0.1** (roadmap v0.2). A config example + README is the first-run substitute.
- **No registry, leaderboard, MCP, `.cursor/rules` generation/migration.**
- **No fake stars, fake users, sock-puppet issues, bought traffic, or “official standard” claims.** GTM anti-goals stand.
- **Do not claim Codex for Open Source eligibility.** Gate is usage + maintenance evidence, not a date.
- **Do not invent `@v0` or npm downloads.** Pin Action to `@main` or a real tag created after review.
- **Do not add runtime dependencies to the CLI.** `@actions/core` stays Action-bundle-only.
- **Do not relax TypeScript strict or introduce `any` in `src/`.** `npm run verify` remains the gate.
- **Do not change scoring semantics without bumping `schemaVersion`** (spec §5).
- **Do not auto-enable `badge-write` or force-push `gh-pages` on this repo** until ignore + a non-destructive writer exist.
- **Do not open placeholder good-first-issues** that are not actually good first issues.

---

## Appendix: evidence snapshot (2026-08-22)

```
GitHub:  daichunghy/agentsmd
stars 0  forks 0  issues 0  releases 0  tags 0
community health 42%
discussions: on    pages: off    topics: 20
CI: 2 successful runs (ubuntu-latest)
npm: unpublished
Action Marketplace: 0 results
HEAD: 29981865 (docs: real badge urls)
Self-score artifact: 70/100, 14 errors, 2 warnings (fixture pollution)
```

v0.1 core (lint / doctor / sync / score / Action bundle / goldens) is **implemented**. The gap is not “missing rules.” The gap is **installability, first-run honesty, dogfooding, and the public-trust files reviewers look at before stars exist.**
