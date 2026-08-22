# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `agentsmd init [--json] [--config] [--force]` scaffolds a short root
  `AGENTS.md` (and optional `agentsmd.config.json`) in a git repository
- Root and per-command `--help` covering commands, flags, examples, and
  exit codes
- GitHub community files: contributing, code of conduct, security,
  support, CODEOWNERS, issue/PR templates, Dependabot
- GitHub Action usage docs and copy-paste example workflows

## [0.1.0-alpha.1] - 2026-08-22

### Added

- `agentsmd lint`, `doctor`, `sync`, and `score`
- GitHub Action with PR annotations, `score` output, and optional
  gh-pages badge data
- Deterministic JSON reports and score schema `1.0.0`
- Eleven lint rules (dead paths/commands, sprawl, budgets, hygiene)

[Unreleased]: https://github.com/daichunghy/agentsmd/compare/v0.1.0-alpha.1...HEAD
[0.1.0-alpha.1]: https://github.com/daichunghy/agentsmd/releases/tag/v0.1.0-alpha.1
