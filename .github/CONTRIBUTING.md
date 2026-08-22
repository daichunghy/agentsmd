# Contributing

Thanks for helping with agentsmd. Keep changes small and testable.

## Setup

- Node.js >= 18
- `npm install`

## Verify

`npm run verify` is the full gate: typecheck, build, action bundle, tests
(including golden fixtures, determinism, text/JSON parity, and process
tests). Run it before opening a PR.

```sh
npm run verify
```

## Commits

Use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:`, `fix:`, `test:`, `chore:`, `docs:`

## Code rules

- TypeScript strict mode; no `any` in `src/`.
- The CLI has **zero runtime dependencies**. Action-only deps are inlined
  into `action-dist` at build time — do not add them to the published CLI.
- Lint, doctor, score, and `--json` output must stay deterministic: no
  timestamps, no absolute paths, canonical JSON with sorted keys.
- `sync` never modifies `AGENTS.md`. `init` may create a missing root
  `AGENTS.md` (or overwrite it only with `--force`).
- Do not add merge gates, policy evaluation, a registry, or MCP.

## Tests

- Unit tests live in `test/` and use `MemFs` trees.
- Fixture repos live in `fixtures/`; update `test/golden/*.json` when a
  fixture's lint/score output intentionally changes.
- Prefer covering a new flag or command with a CLI or process test.

## Pull requests

1. One concern per PR.
2. Describe the user-visible change.
3. Include `npm run verify` passing locally.
