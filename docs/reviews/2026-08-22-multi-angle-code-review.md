# Multi-angle code review — agentsmd local `main` P0

Reviewed local `main` (7 commits ahead of `origin/main`) against the P0 work: `init`, help, `RealFs` mkdir, discovery `SKIP_DIRS`, sync `adoptHint`, score `failOn`, cursor doctor, gitignore leftovers, and process-test pack-in-temp.

Sources: `src/init.ts`, `src/cli.ts`, `src/fs-types.ts`, `src/discovery.ts`, `src/sync.ts`, `src/wiring.ts`, `src/score.ts`, `src/report.ts`, `test/*.ts`, `.gitignore`, `package.json`, and the local-vs-origin diff.

## Summary

The P0 behavior that was supposed to land is present and, on the items below, correct.

**init does not overwrite without `--force`.** `runInit` → `maybeWrite` treats `readUtf8 !== undefined` as exists and returns early unless `force` is set. Unit tests, process tests, and the in-repo CLI tests (`init --json` against this checkout’s `AGENTS.md`) all assert the file is left unchanged. `--force` is required to replace `AGENTS.md` and, with `--config`, `agentsmd.config.json`. Init never writes `CLAUDE.md` / `GEMINI.md` / Copilot files. Outside a git repo it prints `not inside a git repository` and exits 2.

**Help / CLI contract (behavior).** Root `--help`/`-h` and per-command `--help` exit 0. Unknown commands exit 2. `lint` / `doctor` / `score` share `exitCodeFor` (0 clean, 1 at-or-above `failOn`, 2 git/config). `sync` stays 0 on success, including the refuse-and-hint path. `init` stays 0 on skip or write. That matches spec §5 for 0/1/2. Root help lists those codes; lint/doctor help repeats them. Score/init/sync help is thinner (see Issue 2).

**`RealFs.writeUtf8` mkdir.** `mkdirSync(dirname(path), { recursive: true })` runs before `writeFileSync`. That unblocks `sync` writing `.gemini/settings.json` and `.github/copilot-instructions.md`. Covered by `test/fs-types.test.ts`.

**Discovery `SKIP_DIRS` vs `test/`.** The new names are `fixtures`, `coverage`, and `action-dist`, alongside the old `.git` / `node_modules` / `dist` / `.agentsmd-tmp`. **`test/` is not skipped.** A nested `test/AGENTS.md` is still inventoried. That is the right default for Codex-style nested files. Too-broad basename matching is Issue 1.

**sync `adoptHint`.** Unmanaged `CLAUDE.md` without `--adopt` no longer reports `nothing to change`. `adoptHint` is set to a message containing `sync --adopt`, printed on stderr; the file is untouched. `--adopt` wraps content; a following `sync` is silent. Unit + process tests cover this.

**score `failOn` is not wrong.** `src/score.ts` is unchanged (scoring model only). `scoreCommand` now lints once, prints the report, and returns `exitCodeFor(findings, ctx.inv.config.failOn)` — the same helper as lint. Default `failOn: "error"` does not fail on warnings (`claude-unmanaged`); `"warning"` does. The process test in a temp repo asserts exit 0 then 1. Exit is based on lint findings, not the 0–100 number, which is what root/score help and spec §5 describe.

**Cursor doctor.** When `ctx.inv.cursorRules.length > 0`, the cursor line appends `; .cursor/rules N file(s)`. Absent otherwise. Tested in `test/wiring.test.ts`. Inventory still only counts `.cursor/rules/*.mdc` at repo root (pre-existing).

**Gitignore leftovers.** `.gitignore` now has `*.tgz` and `agentsmd-out/`. Commit `bd4c244` deleted `agentsmd-0.1.0-alpha.1.tgz` and `agentsmd-out/score.json` from the index. `git ls-files` does not list them. `action-dist/index.js` remains tracked (Action bundle, not a leftover).

**Process pack-in-temp.** `npm pack --silent --pack-destination <tmp>` and `tar` from that tmp dir. The tarball is no longer written to the repo cwd.

## Issues

### Issue 1 -- Severity: bug
- Angle: discovery skip false-negatives (too broad)
- File: src/discovery.ts:37
- Description
  `SKIP_DIRS` is a set of directory **basenames**, and `walk` applies `SKIP_DIRS.has(name)` at **every** depth. Adding `fixtures`, `coverage`, and `action-dist` therefore hides instruction files under any folder with those names (`fixtures/AGENTS.md`, `packages/foo/fixtures/AGENTS.md`, `src/coverage/AGENTS.md`, …), in every consumer repo, with no config override.

  That fixes dogfooding this repository (root `fixtures/` was producing dead-path errors), but it is broader than P0.2’s intended `ignore` in `agentsmd.config.json` with a default of “skip nothing extra.” Users who actually keep nested `AGENTS.md` under a `fixtures` directory get a silent false negative: lint/doctor/score never see the file. `action-dist` is this repo’s Action output name and is even less likely to be a valid skip for strangers.

  The skip is **not** too narrow on `test/`: `test` is not in the set, so `test/AGENTS.md` is still walked. There is also no test that locks that non-skip.
- Suggestion
  Keep generic skips (`.git`, `node_modules`, `dist`) as they are. Move `fixtures` / `coverage` / `action-dist` to an overridable config `ignore` (repo-root prefixes or globs), and put `"ignore": ["fixtures/**"]` (plus coverage/action-dist if desired) in **this** repo’s `agentsmd.config.json`. If a hardcoded skip must stay, match only repo-root names (`dir === "" && SKIP_DIRS.has(name)`), not every nested basename. Add a test that `test/AGENTS.md` and `pkg/fixtures/AGENTS.md` (if ignore is prefix-based, only the configured prefix) behave as intended.
- Status: open

### Issue 2 -- Severity: nit
- Angle: CLI contract (exit codes)
- File: src/cli.ts:114
- Description
  `scoreCommand` returns 2 for both “not inside a git repository” and `ConfigError`, same as lint/doctor. `SCORE_HELP` documents exit 2 only as “when not in a git repository,” which reads as an exhaustive list and omits invalid config.

  `INIT_HELP` and `SYNC_HELP` do not mention exit codes at all. `init` does exit 2 outside a git repo; `sync` exits 2 on missing git or invalid config. Root help still states the global 0/1/2 map correctly, so this is documentation drift in the new per-command help, not a wrong exit in code.
- Suggestion
  Copy the lint/doctor exit-code sentence onto score (`… or config is invalid`). Add the same one-liner to init (2 = not a git repo) and sync (2 = not a git repo or invalid config; sync never exits 1).
- Status: open
