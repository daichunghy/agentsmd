# AGENTS.md

## Setup

Run `npm install` once; Node >= 18.

## Build

`npm run build` compiles `src/` to `dist/`. `npm run build:action` bundles
the GitHub Action entry to `action-dist/index.js` (committed).

## Test

`npm run verify` is the full gate: typecheck, build, action bundle, tests
(including golden fixtures, determinism, text/JSON parity, and process
tests). Run it before considering any change complete.

## Conventions

- TypeScript strict mode; no `any` in `src/`.
- The CLI keeps zero runtime dependencies; Action-only dependencies are
  inlined into `action-dist` at build time.
- Core logic is pure over the injected `FileReader`; tests use `MemFs`
  fixture trees from `fixtures/`.
- Lint/score output must stay deterministic: no timestamps, no absolute
  paths, canonical JSON with sorted keys.
- Conventional commits (`feat:`, `fix:`, `test:`, `chore:`, `docs:`).
- Design authority: `docs/superpowers/specs/2026-08-22-agentsmd-mvp-design.md`.
