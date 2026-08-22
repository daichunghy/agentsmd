# agentsmd MVP Design (v0.1)

**Date:** 2026-08-22
**Status:** Approved design — pending spec review
**Author:** daichunghy (with ZCode agent)
**License:** MIT
**Approach:** Verifier-first ("ESLint for agent instructions"), approved 2026-08-22

## 1. Problem and motivation

AI coding agents read project instructions from per-tool files: `AGENTS.md`
(Codex, Cursor, Copilot cloud agent/code review, and the open standard),
`CLAUDE.md` (Claude Code), `GEMINI.md` (Gemini CLI, configurable), and
`.github/copilot-instructions.md` (Copilot Chat). Teams using more than one
tool accumulate several near-identical instruction files that "rot in
silence": one copy gets updated, another goes stale, and no one can tell
which copy is current. Instruction files also drift from the codebase
(dead paths, removed scripts) and silently exceed context budgets.

Claude Code does not read `AGENTS.md`, not even as a fallback
(anthropics/claude-code issue #6235 has thousands of reactions), which keeps
the multi-file problem alive. The community-endorsed solution pattern is
"declare one source, verify the wiring" — but no existing tool verifies the
wiring end to end. Current competitors are tiny and fragmented:
`agents-lint` (13 stars, quiet since 2026-03), `agent-sync` (5 stars, stale
since 2025-08), `@reaatech/agents-md-kit` (2 stars), `aicfg` (0 stars),
`RuleStack` (a small nightly-scored gallery site with ~713 repositories,
not connected to any tool).

**Product one-liner:** one source of truth for AI agent instructions —
linted, wired, scored.

## 2. Goals and non-goals

**Goals (v0.1)**

1. `agentsmd lint` — deterministic detection of instruction rot: dead
   paths, dead commands, budget overruns, sprawl (duplicated instruction
   files), hygiene issues.
2. `agentsmd doctor` — verify the wiring: does each detected agent tool
   actually load the single source?
3. `agentsmd sync` — generate and repair the minimal wiring artifacts
   (Claude stub, Gemini config); never duplicate content; idempotent.
4. `agentsmd score` — explainable 0–100 score with a versioned JSON
   schema, suitable for badges and CI.
5. GitHub Action with PR annotations and a weekly-rot cron pattern.
6. CLI with zero runtime dependencies (the GitHub Action bundle inlines its
   single dependency, `@actions/core`), Node >= 18, TypeScript strict mode,
   no `any` in production code.

**Non-goals (v0.1)**

- Registry / leaderboard (v0.2), MCP server mode, `.cursor/rules`
  generation or migration, semantic conflict analysis between files,
  instruction enforcement (PatchGate's lane; cross-link only),
  reading or executing repository code beyond static file inspection.

## 3. Vendor behavior matrix (drives the target modules)

Sourced from official documentation on 2026-08-22. Encoded as fixtures so
behavior changes fail tests visibly.

| Tool | Files read | AGENTS.md native | Mechanism notes |
| --- | --- | --- | --- |
| OpenAI Codex | `AGENTS.md`, `AGENTS.override.md` | Yes | Global `~/.codex/AGENTS.md`; root→cwd walk, one file per directory, fallback names via `project_doc_fallback_filenames`; combined chain capped at `project_doc_max_bytes` (default 32 KiB) |
| Claude Code | `CLAUDE.md` | No (no fallback) | `@AGENTS.md` import stub or symlink (symlink needs admin/Developer Mode on Windows → prefer import); `~200 lines` recommended; `/init` and `/import` exist but copy content |
| Gemini CLI | `GEMINI.md` default | Via config | `.gemini/settings.json` `context.fileName` accepts an array, e.g. `["AGENTS.md", "GEMINI.md"]`; hierarchical global→ancestors→subdirectories; `@file.md` imports |
| Cursor | `AGENTS.md` (+ `.cursor/rules/*.mdc`) | Yes | Root and nested `AGENTS.md`, more specific wins; `.cursor/rules` only for conditional (globs/alwaysApply) rules |
| GitHub Copilot | `.github/copilot-instructions.md` | Cloud agent & code review: yes; Chat: no | Path-specific `.github/instructions/*.instructions.md`; no import syntax in copilot-instructions.md |

Sources: developers.openai.com/codex/guides/agents-md, code.claude.com/docs
(memory), google-gemini.github.io/gemini-cli (GEMINI.md + configuration),
cursor.com/docs/rules, docs.github.com (custom instructions support),
agents.md (spec — stewarded by the Agentic AI Foundation under the Linux
Foundation; 60k+ repositories).

## 4. Architecture

```text
src/
  cli.ts            # command dispatch, exit codes
  config.ts         # agentsmd.config.json discovery, defaults, validation
  discovery.ts      # repo root detection, instruction-file inventory
  markdown/         # minimal parser: headings, lists, code blocks/fences,
                    # inline code, links, comments (no AST dependency)
  targets/          # one module per tool; pure functions over the inventory
    codex.ts        # chain emulation root→cwd, 32 KiB budget, fallback names
    claude.ts       # stub verify (@AGENTS.md import), manage/adopt states
    gemini.ts       # settings.json read/merge of context.fileName
    cursor.ts       # native AGENTS.md detection (incl. nested)
    copilot.ts      # native (cloud agent) + optional managed copy (Chat)
  rules/            # lint rule registry; each rule a pure function
  wiring.ts         # doctor: orchestrates target verification
  score/            # scoring model, schema-versioned
  report/           # text and JSON renderers (parity tested)
  action/           # GitHub Action entry (annotations, artifact, badge JSON)
schemas/            # score-report.schema.json (versioned)
fixtures/           # deterministic golden repo trees (see §10)
test/
action.yml
package.json        # name: agentsmd, bin: agentsmd, engines node>=18
```

**Data flow:** discover inventory → parse files → rules and target modules
produce findings → doctor merges wiring findings → score aggregates →
render (text or JSON). Every stage is pure given the repo tree; the only
I/O happens in discovery and report writing.

## 5. Determinism contract

- Lint and score outputs contain no timestamps, no absolute paths, no
  environment-dependent values.
- JSON output uses canonical serialization (sorted keys, no trailing
  whitespace). Two runs over the same tree produce byte-identical output
  (enforced by a repeat-run test).
- `score.schemaVersion` follows semver: any change to scoring semantics
  bumps the version.
- Exit codes: `0` clean; `1` findings at or above the `fail-on` threshold
  (default `error`); `2` configuration error; `3` unexpected internal
  error.
- Text and JSON renderers must report identical findings (parity test).

## 6. Lint rules (v0.1)

Severity defaults are configurable via `agentsmd.config.json`
(`rules.<id>.severity = "error" | "warning" | "off"`).

| Rule | Severity | Definition |
| --- | --- | --- |
| `dead-path` | error | A backtick-quoted or fenced relative repo path referenced in an instruction file does not exist on disk |
| `dead-command` | error | A referenced command (npm script, make target) is not defined |
| `codex-budget-overflow` | error | Sum of the Codex chain (root→cwd `AGENTS.md`/`AGENTS.override.md`) exceeds 32 KiB (configurable override) |
| `claude-length-warn` | warning | `CLAUDE.md` exceeds 200 non-marker lines (marker comments and blank lines between blocks excluded) |
| `stub-broken` | error | Managed `CLAUDE.md` exists but the `@AGENTS.md` import or markers are missing/edited |
| `claude-unmanaged` | warning | `CLAUDE.md` exists without agentsmd markers (run `sync --adopt`) |
| `gemini-unwired` | warning | Gemini target detected (a `GEMINI.md` or `.gemini/settings.json` exists) but `context.fileName` does not include `AGENTS.md` |
| `sprawl-duplicate` | error | Another instruction file's normalized content has Jaccard similarity >= 0.7 with `AGENTS.md` (normalization: lowercase, strip markdown syntax, collapse whitespace; token-set Jaccard) |
| `todo-rot` | warning | `TODO`/`FIXME` markers older than the file's last-relevant change — v0.1 simplification: any `TODO`/`FIXME` in instruction files is reported |
| `secret-like` | error | High-confidence secret patterns (private key blocks, `api_key =`-style assignments) |
| `absolute-path-portability` | warning | Absolute paths (`/Users/...`, `C:\...`) that break on other machines |

Findings carry `ruleId`, `severity`, `file`, `line`, `message`, `fixHint`.

## 7. Sync semantics (invariants)

- `AGENTS.md` is never modified by any command.
- `.cursor/rules` is never modified in v0.1.
- **Claude stub format (managed):**

  ```markdown
  <!-- agentsmd:begin:import -->
  @AGENTS.md
  <!-- agentsmd:end:import -->

  <!-- agentsmd:begin:claude-only -->
  (optional Claude-specific instructions; preserved across syncs)
  <!-- agentsmd:end:claude-only -->
  ```

  - No `CLAUDE.md` → `sync` creates the stub with the import block only
    (the `claude-only` block is added on the first `--adopt` or when
    `sync` needs to preserve user content).
  - Unmanaged `CLAUDE.md` → `sync` refuses and instructs `sync --adopt`,
    which wraps existing content into the `claude-only` block and
    prepends the import block. No content is ever deleted.
  - Managed stub → `sync` restores the import block if broken; content
    between `claude-only` markers is preserved verbatim.
- **Gemini merge:** read `.gemini/settings.json` (create if absent);
  `context.fileName` becomes the union of its current value(s) and
  `"AGENTS.md"`. A string value is widened to an array. Union only adds —
  sync never removes entries. All other keys preserved.
- **Copilot Chat managed copy (optional, default off):** generated only
  with `--copilot-copy`, headed with a managed-marker + content hash; any
  hand edit is flagged by `lint` (`stub-broken` applies to managed copies
  too).
- **Idempotency invariant:** running `sync` twice produces no diff on the
  second run (enforced by test).

## 8. Score model v1 (`score.schemaVersion` 1.0.0)

100 points, each deduction bound to a concrete finding id (explainable in
the report):

- **Coverage 30:** heading presence in the root `AGENTS.md` —
  setup/install (8), build (8), test (8), style/conventions/architecture
  (6). Heading match is by normalized heading text; configurable set.
- **Freshness 30:** start at 30; −10 per lint error, −3 per lint warning,
  floor 0.
- **Wiring 25:** per detected target — Claude stub managed and intact,
  Gemini wired, no sprawl findings. If no wiring targets are detected
  (single-tool repo using only AGENTS.md), award 25 with the note
  `"no wiring targets present"`.
- **Size 15:** root `AGENTS.md` bytes: <= 16 KiB → 15; <= 24 KiB → 10;
  <= 28 KiB → 5; > 28 KiB or chain overflow → 0.

Score output is a JSON document (schema in `schemas/`) plus a human
renderer; badges consume the JSON.

## 9. GitHub Action and badge

- `action.yml` inputs: `fail-on` (`error` default | `warning` | `never`),
  `config` (path, default `agentsmd.config.json` if present).
- Behavior: run `agentsmd score --report`; emit `::error`/`::warning`
  annotations per finding; upload the score JSON as an artifact; on push
  to the default branch with `badge-write: true`, commit `score.json` to
  the `gh-pages` branch for a shields.io/endpoint badge (documented
  snippet).
- Documented (not auto-generated) weekly cron workflow catches silent rot
  between changes.

## 10. Testing requirements

Golden fixture repo trees under `fixtures/` (deterministic, no network):

1. healthy single-tool repo (only `AGENTS.md`) — clean lint, score parity;
2. sprawl case — `CLAUDE.md` + `GEMINI.md` near-duplicates → `sprawl-duplicate`;
3. broken stub — edited import block → `stub-broken`; `sync` repairs;
4. adopt case — unmanaged `CLAUDE.md` → `--adopt` wraps content;
5. gemini merge — existing `settings.json` keys preserved, union adds;
6. budget overflow — nested chain > 32 KiB → `codex-budget-overflow`;
7. dead paths / dead commands / todo / secret / absolute-path positives;
8. idempotent sync — double run, no second diff;
9. determinism — repeat run byte-identical (lint + score);
10. text/JSON parity;
11. process test — `npx agentsmd` executes from a packed tarball;
12. vendor matrix — per-target emulation tests pinned to §3.

## 11. Repository and release operations

- Local path: `/Users/macos/Desktop/agentsmd` (sibling of the PatchGate
  repository; never nested inside it).
- GitHub: `daichunghy/agentsmd`; MIT; CI workflow mirrors PatchGate's
  `npm run verify` gate (build, typecheck, lint, unit, fixture,
  determinism, parity, process tests).
- Tooling: TypeScript 5.x (avoid the TS 7 bundling issue PatchGate hit),
  vitest, tsup/esbuild builds; the Action bundle is committed (inline its
  one dependency, `@actions/core`; the CLI itself stays zero-dependency).
- npm: publish `agentsmd` early (name verified free 2026-08-22) — first
  publish can be `0.1.0-alpha` pre-release.

## 12. Roadmap

- **Week 1 (2026-08-22 → 08-28):** repo scaffold, CI, parser, discovery,
  targets, `lint` with the first seven rules (through `gemini-unwired`),
  first fixtures.
- **Week 2 (08-29 → 09-04):** remaining four rules (`sprawl-duplicate`,
  `todo-rot`, `secret-like`, `absolute-path-portability`), `doctor`,
  `sync` (stub/adopt/gemini), `score` + schema, renderers,
  determinism/parity tests.
- **Week 3 (09-05 → 09-11):** Action + badge, README with wiring guide,
  full fixture set, `init` as stretch goal, launch prep (Show HN,
  r/ClaudeAI, dev.to post "Ending the sprawl").
- **Launch:** ~2026-09-12.
- **v0.2 (09-12 → 09-26):** registry + leaderboard (submission via PR to
  a JSON registry; static site on GitHub Pages), `init`, Cursor rules
  migration helper.

## 13. Success metrics and program tie-in

Targets (targets, not predictions): 300+ GitHub stars and 100+ repositories
carrying an agentsmd badge by end of October 2026; at least one external
contributor PR. At that point submit the Codex for Open Source application
referencing both PatchGate (enforcement lane) and agentsmd (instruction
lane) under one coherent story. Do not claim program eligibility or
selection before evidence exists.

## 14. Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Vendor behavior changes (import syntax, budgets, discovery) | Vendor matrix is fixture-pinned (§3); `doctor` surfaces wiring drift loudly |
| Claude Code ships native `AGENTS.md` support | Tool's lint/rot/score core survives; stub generation becomes obsolete gracefully (doctor detects native support and skips stub advice) |
| Symlink/`@import` DIY solutions are "good enough" | Differentiate on drift detection, sprawl detection, score, CI integration — none of which DIY covers |
| Scope creep toward platform features | Non-goals list (§2) is binding; registry waits for v0.2 by decision |
| Solo maintainer load across two projects | agentsmd time-boxed to ~3 weeks to launch; PatchGate gates G2/G4 continue per their own track |
| npm name pressure | Publish `0.1.0-alpha` during week 1 |

## 15. Relationship to PatchGate

agentsmd operates on the **instruction lane** (what agents read before
working); PatchGate operates on the **enforcement lane** (whether a PR has
earned review). No shared code in v0.1 (separate repositories and
packages). Cross-links: agentsmd README references PatchGate for
merge-gating; a future PatchGate release may consume `agentsmd score` as
an advisory signal. Neither tool claims the other's guarantees.
