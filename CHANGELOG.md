# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0-alpha.2] - 2026-08-22

### Added
- Action `config` input and `ignore` prefixes in `agentsmd.config.json`
- `score --report <path>`
- Publish workflow (needs `NPM_TOKEN`) and `docs/publish.md`
- Static terminal demo at `docs/examples/demo.svg`

### Changed
- Version `0.1.0-alpha.2`; Action examples pin that tag
- Unmanaged `CLAUDE.md` can be `sprawl-duplicate` (managed stubs stay exempt)

### Fixed

- Root-only skip for `fixtures` / `coverage` / `action-dist` so nested
  `pkg/fixtures/AGENTS.md` is still inventoried
- Clone-first README (`npm install && npm run build`) until npm publish
- `findRepoRoot` accepts backslash cwd segments

### Added

- `agentsmd init [--json] [--config] [--force]` scaffolds a short root
  `AGENTS.md` (and optional `agentsmd.config.json`) in a git repository
- Root and per-command `--help` covering commands, flags, examples, and
  exit codes
- GitHub community files: contributing, code of conduct, security,
  support, CODEOWNERS, issue/PR templates, Dependabot
- GitHub Action usage docs and copy-paste example workflows

### Changed

- README drops the unpublished npm badge and states there is no
  Marketplace listing or `v0` Action tag yet

### Fixed

- `RealFs.writeUtf8` creates missing parent directories (`.gemini/`, `.github/`)
- Discovery skips `fixtures/`, `coverage/`, and `action-dist/`
- `sync` prints `sync --adopt` when `CLAUDE.md` is unmanaged
- `score` honors `failOn` like lint and doctor
- Doctor summary mentions `.cursor/rules` when those files exist

## [0.1.0-alpha.1] - 2026-08-22

### Added

- `agentsmd lint`, `doctor`, `sync`, and `score`
- GitHub Action with PR annotations, `score` output, and optional
  gh-pages badge data
- Deterministic JSON reports and score schema `1.0.0`
- Eleven lint rules (dead paths/commands, sprawl, budgets, hygiene)

[Unreleased]: https://github.com/daichunghy/agentsmd/commits/main
[0.1.0-alpha.2]: https://github.com/daichunghy/agentsmd/releases/tag/v0.1.0-alpha.2
[0.1.0-alpha.1]: https://github.com/daichunghy/agentsmd/commits/main
