# 2026-08-22 multi-angle review (first user + Codex-for-OSS)

**Date:** 2026-08-22  
**Tree:** `/Users/macos/Desktop/agentsmd` (local working copy)  
**Also checked:** `origin/main` as of this review, `https://registry.npmjs.org/agentsmd`, GitHub releases/tags, repo API  
**Personas:** A) non-specialist first user (README, init, doctor, Action YAML) · B) Codex-for-OSS evaluator (honest alpha, no fake npm/stars)  
**Method:** read the listed docs and community files; do not change product code.

## Summary

Local docs are mostly honest. GitHub `main` is not.

**Verification (local tree):**

| Check | Local tree | Public `origin/main` (fetched 2026-08-22) |
| --- | --- | --- |
| README still shows `npx agentsmd doctor` | Yes (`README.md:12`). Qualified two lines later: npm is unpublished; clone and `npm pack` / `node dist/main.js` (`README.md:15-16`). Quick start (`README.md:47-52`) repeats `npx` without restating that. | Yes, **unqualified**. npm version badge still links to `https://www.npmjs.com/package/agentsmd`. Registry returns `{"error":"Not found"}`. |
| Action pin is not a nonexistent `@v0` | Yes. Examples pin `@main` (`README.md:104`, `docs/github-action-usage.md:41`, `docs/examples/weekly-rot.yml:18`). Copy states there is no Marketplace listing and no `v0` tag (`README.md:110-111`, `docs/github-action-usage.md:47-48`). | **Still `uses: daichunghy/agentsmd@v0`.** Zero GitHub releases/tags. |
| Community files exist and are short/usable | Yes locally: CONTRIBUTING (~49 lines), SUPPORT (~25), SECURITY (~25), PR template (~12), CODEOWNERS (1), Dependabot, bug/feature issue forms. CoC is the usual Covenant length, not a custom essay. | Not on the pushed repo. `docs/reviews/2026-08-22-feature-roadmap.md:13` says this session’s files are local `main`, not pushed. GitHub API: 0 issues, 0 PRs, created 2026-08-22. |
| No Codex selection or download claims | Local README disclaims selection (`README.md:8-9`). No download counts, no star badges. `package.json` keywords include `codex` as a tool name only. | No selection/download numbers either. The **npm version badge** still implies a published package. |

**What a stranger actually hits today is `origin/main`.** That README still leads with a 404 npm badge, an `npx` command that cannot resolve, and an Action pin `@v0` that does not exist. Local honesty (unpublished npm, `@main`, community files, `init`) is real in this working copy and is not the public product.

Remaining local first-run gap: even the qualified clone recipe omits `npm install && npm run build`, and `dist/` is gitignored, so `node dist/main.js` and `npm pack` fail on a fresh clone. `docs/github-action-usage.md:72-73` is closer (`npm run build` then `node dist/main.js`) than the README.

No fake star counts or “we were selected” language in the listed files. Do not treat this local tree as the Codex-for-OSS surface until it is pushed and `npx agentsmd` works from the registry.

## Persona A issues (non-specialist first user)

### A1. bug — GitHub README is the first-user page and still lies about install

- **File:** `README.md:12` (local, honest) vs `https://raw.githubusercontent.com/daichunghy/agentsmd/main/README.md` (public, not)
- **Status:** open
- **Issue:** A first user opens the GitHub repo, not this Desktop path. Public `main` still has an npm version badge, unqualified `npx agentsmd doctor` / Quick start, and `uses: daichunghy/agentsmd@v0`. `npx` fails (package unpublished). The Action pin 404s (no `v0` tag, no releases). Local README dropped that badge and moved the pin to `@main`, but that is not what the user sees until push.

### A2. bug — Local clone fallback still does not run

- **File:** `README.md:15`
- **Status:** open
- **Issue:** After the unpublished caveat, the documented escape is clone then `npm pack` or `node dist/main.js`. `.gitignore:2` ignores `dist/`. There is no `prepublishOnly` / `prepare` in `package.json`. A fresh clone has no `dist/main.js`; `npm pack` ships an empty CLI; `node dist/main.js` is `ENOENT`. Missing: `npm install && npm run build` (and then `node dist/main.js …`). Action usage is slightly better (`docs/github-action-usage.md:72`) but still skips `npm install`.

### A3. suggestion — Quick start is a copy-paste `npx` block with no unpublished note

- **File:** `README.md:47`
- **Status:** open
- **Issue:** The hero fence is qualified at `README.md:15-16`. The next command block (`init` / `doctor` / `sync` / `lint` / `score`) is all `npx` and will be copied in isolation. `--help` examples are the same (`src/cli.ts:38`). `docs/github-action-usage.md:67` repeats `npx` before the caveat at line 72. First users copy fences, not the paragraph under them.

### A4. suggestion — `doctor` (and lint/score/sync) need a git repo; only `init` says so in Quick start

- **File:** `README.md:48`
- **Status:** open
- **Issue:** Quick start comments “git repo required” on `init` only. `doctor`/`lint`/`score`/`sync` all call `findRepoRoot` and print `not inside a git repository` (exit 2) — `src/cli.ts:161`, `src/lint.ts:40`. A user who skips `init` and runs the hero `doctor` in a random folder gets a one-line error with no “run this in a git checkout” recovery. `agentsmd doctor --help` does mention exit 2 (`src/cli.ts:87`).

### A5. suggestion — Windows first run of `init`/`doctor` can miss `.git`

- **File:** `src/discovery.ts:29`
- **Status:** open
- **Issue:** `findRepoRoot` splits `cwd` on `"/"`. On Windows, `process.cwd()` is backslash-separated, so `init` and `doctor` can report “not inside a git repository” inside a real repo. Roadmap already names this (`docs/reviews/2026-08-22-feature-roadmap.md:35`). README does not warn that Windows is untested. Non-specialist on Windows hits a dead end after the clone dance.

### A6. nit — Status line assumes the reader knows “Codex-for-OSS”

- **File:** `README.md:8`
- **Status:** open
- **Issue:** “Not a Codex-for-OSS selection claim and not a statement of program eligibility” is correct for persona B and opaque for persona A. A first user does not need the program name in the hero; “public alpha, not on npm yet” is the useful sentence.

### A7. nit — `init` succeeds with no next step

- **File:** `src/cli.ts:165`
- **Status:** open
- **Issue:** Successful `init` prints `wrote AGENTS.md` and exits. It does not point at `doctor` or `sync`. Fine for a specialist; a first user who only ran `init` does not know they are done or what to run next. Starter file itself is short and usable (`src/init.ts:14`).

### A8. nit — Action copy-paste is usable locally; badge-write is easy to turn on unsafely

- **File:** `README.md:103`
- **Status:** open
- **Issue:** Local YAML (`@main`, `fail-on: error`, `badge-write: false`) is a working first paste if the repo is public and `action-dist/index.js` is on the pinned ref. `docs/github-action-usage.md:27-45` is a complete workflow. `badge-write: true` force-pushes an orphan `gh-pages` (`src/action/index.ts:70`). The usage doc says `contents: write` is required (`docs/github-action-usage.md:62`); the example workflows keep `contents: read` and `badge-write: false`, which is safe. A first user flipping the boolean in the README snippet without changing permissions gets a quiet warning, not a working badge.

### A9. nit — CoC enforcement is a public issue

- **File:** `.github/CODE_OF_CONDUCT.md:64`
- **Status:** open
- **Issue:** Harassment reports are directed to “open an issue” on the repo (or a GitHub profile mention). That is a public channel. SUPPORT/SECURITY correctly send vulnerabilities to a private advisory (`.github/SUPPORT.md:23`, `.github/SECURITY.md:5`). Community files otherwise are short and usable: CONTRIBUTING (~49 lines, `npm run verify`), SUPPORT, SECURITY, issue/PR templates, CODEOWNERS, Dependabot.

## Persona B issues (Codex-for-OSS evaluator)

### B1. bug — Honesty fixes are local-only; public `main` still advertises unpublished npm and a fake Action tag

- **File:** `docs/reviews/2026-08-22-feature-roadmap.md:13`
- **Status:** open
- **Issue:** Roadmap records that unpublished-npm / no-`@v0` README work landed on local `main` and was **not pushed**. Evaluator surface is GitHub: npm badge, `npx agentsmd doctor`, `uses: …@v0`. Confirmed this review: registry 404, zero releases, zero tags, `stargazers_count: 0`. That is the old audit finding (`docs/reviews/2026-08-22-independent-improvement-audit.md:32-34`) still true **on origin**. Shipping the local README without pushing it does not make the application honest.

### B2. bug — CHANGELOG points at a GitHub tag/release that does not exist

- **File:** `CHANGELOG.md:43`
- **Status:** open
- **Issue:** Footer links `[0.1.0-alpha.1]` to `…/releases/tag/v0.1.0-alpha.1` and Unreleased to `compare/v0.1.0-alpha.1...HEAD`. GitHub has no releases and no tags. Version in `package.json:3` / `src/version.ts:1` is `0.1.0-alpha.1`, while `init` and community files sit under `[Unreleased]` (`CHANGELOG.md:8-18`). An evaluator clicking the changelog “release” gets an empty Releases page. Do not imply a tagged alpha until the tag exists.

### B3. suggestion — Local README is qualified, but `npx` is still the hero on an unpublished package

- **File:** `README.md:12`
- **Status:** open
- **Issue:** Qualification at `README.md:15-16` is real. Roadmap still calls the hero command “a lie on a clean machine” (`docs/reviews/2026-08-22-feature-roadmap.md:33`). Until `0.1.0-alpha.2` is on npm with `publishConfig.tag=alpha`, the first fence should be clone+build (or `npx` behind a comment that it will fail). Do not claim downloads when the registry page appears (`feature-roadmap.md:33`).

### B4. suggestion — Stale in-tree audit contradicts the current local README

- **File:** `docs/reviews/2026-08-22-independent-improvement-audit.md:34`
- **Status:** open
- **Issue:** That audit still says README pins `@v0`, npm badge will 404, community files missing. Local tree has since dropped the badge, pinned `@main`, and added `.github/*`. An evaluator who reads `docs/reviews/` gets two opposite honesty stories from the same day. Mark the audit superseded or it becomes a credibility problem.

### B5. nit — Public GTM docs still read as an application packet

- **File:** `docs/reviews/2026-08-22-feature-roadmap.md:60`
- **Status:** open
- **Issue:** Product README does **not** claim Codex-for-OSS selection or downloads (`README.md:8-9`; no star/download badges). `package.json:40` keyword `codex` is the CLI. In-tree launch/roadmap docs still discuss star gates and later submission (`docs/launch/2026-08-22-gtm-strategy.md`; “Do not submit today”). That is not a fake metric, but a public evaluator who opens `docs/` can read it as the repo existing to apply. Keep the non-goal; do not submit on day 0 (0 stars, unpublished, created 2026-08-22).

### B6. nit — Community-health files are good locally and absent on GitHub

- **File:** `.github/SECURITY.md:1`
- **Status:** open
- **Issue:** Local set is the right shape: private security URL, supported-version table for `0.1.0-alpha.x`, CONTRIBUTING gate, Dependabot, issue forms, CODEOWNERS `@daichunghy`. GitHub community health will not count them until they are on `main`. Zero issues / zero `good first issue` tickets yet (roadmap P1.3). Empty issue tracker plus Discussions enabled (`has_discussions: true`) is fine; do not seed fake Q&A (`feature-roadmap.md:37`).
