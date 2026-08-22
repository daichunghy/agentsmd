# agentsmd independent feature roadmap

**Date:** 2026-08-22  
**Status:** operating plan, not a release or Codex-for-OSS claim  
**Sibling project:** PatchGate stays the enforcement lane. agentsmd does not
gate merges.

This repo’s job is one source of truth for AI agent instructions — linted,
wired, scored. Reviewers for OpenAI Codex for Open Source look at usage,
ecosystem importance, and active maintenance. There is no official star
cutoff. Fake metrics are a terms violation.

## What landed in this session (P0, local `main`, not pushed)

- `agentsmd init` plus real CLI help
- GitHub community files (CoC, CONTRIBUTING, SECURITY, SUPPORT, issue/PR
  templates, CODEOWNERS, Dependabot)
- CHANGELOG, Action usage doc, example config, weekly-rot example
- Shebang, `RealFs` mkdir, discovery skips `fixtures`/`coverage`/`action-dist`
- unmanaged `CLAUDE.md` prints `sync --adopt`
- `score` honors `failOn`; doctor reports `.cursor/rules`
- Honest README: unpublished npm, no `@v0` Action tag

`npm run verify` passed (90 tests) after that work.

## P1 — next, in order (usage pixels)

These are the only changes that can turn an honest ecosystem-importance
hypothesis into something a stranger can run without cloning.

| # | Item | Why | Bound |
| --- | --- | --- | --- |
| 1 | Publish `0.1.0-alpha.2` to npm (`publishConfig.tag=alpha`) with `prepublishOnly` | README’s `npx agentsmd doctor` is currently a lie on a clean machine | Maintainer-gated. Do not claim downloads until the registry page exists |
| 2 | Tag `v0.1.0-alpha.2` and pin Action examples to that tag or a full SHA | `uses: …@main` moves under the caller | Tag after verify on the published commit |
| 3 | Three `good first issue` tickets: Windows `findRepoRoot` (`/` vs `\`), Action `config` path input, process test that runs `lint`/`sync` from the packed tarball | External-contributor surface; Windows is a named GTM limitation | Real issues, not padding |
| 4 | 15-second GIF or asciinema of `init` → `doctor` → `sync` → `score` | GTM Phase 0; reviewers and Show HN both bounce off text-only READMEs | One recording, no stock footage |
| 5 | Enable GitHub Discussions categories and answer the first real question in-thread | Maintenance evidence the form asks for | Do not seed fake Q&A |

## P2 — after first external user

| Item | Why it waits |
| --- | --- |
| Registry / leaderboard / GitHub Pages gallery | Spec v0.2. Do not build a gallery of zero repos |
| Cursor `.mdc` migration | Inventory already collects rules; migration is a different product |
| MCP server mode | Non-goal for v0.1 |
| `sprawl-duplicate` vs unmanaged CLAUDE.md (managed stubs stay exempt) | Correctness, not first-run |
| Configurable coverage headings | Score model polish |
| Native `AGENTS.md` detection for Claude Code if Anthropic ships it | Doctor should then skip stub advice |

## Non-goals (binding)

- Instruction enforcement, required checks, or policy evaluation (PatchGate)
- Duplicating `AGENTS.md` into `CLAUDE.md`
- Claiming Codex-for-OSS eligibility, stars, or npm traffic that does not exist
- Applying to Codex for Open Source with this repo as the *second* identity
  for extra benefits (program terms forbid that)

## Honest application timing

Do not submit agentsmd today (0 stars, unpublished, created 2026-08-22).
Submit later only if `npx agentsmd` works from the registry and at least one
external repo or issue exists that a reviewer can open.
