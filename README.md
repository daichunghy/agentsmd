# agentsmd

**One source of truth for AI agent instructions — linted, wired, scored.**

[![CI](https://github.com/daichunghy/agentsmd/actions/workflows/ci.yml/badge.svg)](https://github.com/daichunghy/agentsmd/actions/workflows/ci.yml)
[![license](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

**Status:** public alpha (`0.1.0-alpha.1`). Not on npm yet.

[![demo](docs/examples/demo.svg)](docs/examples/demo.svg)

Until the package is published, clone and build (needs a git repo):

```sh
git clone https://github.com/daichunghy/agentsmd.git
cd agentsmd
npm install
npm run build
node dist/main.js doctor
```

Intended later (will fail on a clean machine today):

```sh
npx agentsmd doctor
```

Every AI coding agent reads a different instructions file: Codex, Cursor and
the Copilot agent read `AGENTS.md`, Claude Code reads `CLAUDE.md`, Gemini CLI
reads `GEMINI.md`, Copilot Chat reads `.github/copilot-instructions.md`.
Use two tools and you get four near-identical files that **rot in silence** —
you fix one, the others keep teaching your agents last year's rules.

agentsmd keeps `AGENTS.md` the single source, then:

- **verifies the wiring** — does each tool actually load your source of truth?
- **detects rot** — dead paths, removed scripts, sprawl copies, TODO crust
- **guards budgets** — the Codex 32 KiB instruction cap, Claude's ~200-line guidance
- **scores** instruction health 0–100, explainable, CI-ready

## 🌟 Features

- `agentsmd init` — starter `AGENTS.md` (and optional config) in a git repo
- `agentsmd doctor` — wiring report for Codex / Claude Code / Gemini CLI /
  Cursor / GitHub Copilot
- `agentsmd lint` — 11 deterministic rules (dead paths, dead commands,
  sprawl duplicates, secrets, TODO rot, budget overflow, …), text or JSON
- `agentsmd sync` — generates the minimal wiring: a one-line managed
  `CLAUDE.md` stub (`@AGENTS.md` import), Gemini `context.fileName` config;
  **never duplicates content**, always idempotent
- `agentsmd score` — 0–100 with a versioned JSON schema, badge-ready
- Zero runtime dependencies · TypeScript strict · deterministic output
  (repeat runs are byte-identical)

## 🚀 Quick start

```sh
node dist/main.js init            # starter AGENTS.md (git repo required)
node dist/main.js doctor          # see what each agent tool reads today
node dist/main.js sync            # wire Claude Code + Gemini CLI to AGENTS.md
node dist/main.js lint            # find rot
node dist/main.js score           # 0–100 instruction health
```

After `npm install && npm run build`. `npx agentsmd …` is the same once the
registry package exists. Commands other than `--help`/`--version` need a git
repository.

`init --config` also writes `agentsmd.config.json` when missing.
`init --force` overwrites those files with the starter. `sync` still
never modifies `AGENTS.md`.

Inside a repo whose only instruction file is `AGENTS.md`, doctor reports:

```text
codex: native AGENTS.md — chain 1 file(s), 214 byte(s)
cursor: native AGENTS.md — present
copilot: cloud agent reads AGENTS.md natively; chat instructions absent
claude-code: absent
gemini-cli: absent
```

## 🔌 Wiring per tool

| Tool | What agentsmd does |
| --- | --- |
| OpenAI Codex | Nothing needed — reads `AGENTS.md` natively (chain + 32 KiB budget verified) |
| Cursor | Nothing needed — native `AGENTS.md`, nested supported |
| Copilot agent / code review | Nothing needed — reads `AGENTS.md` natively |
| Claude Code | Generates a managed `CLAUDE.md` stub containing `@AGENTS.md` (docs-endorsed import; survives Windows where symlinks need admin) |
| Gemini CLI | Adds `"AGENTS.md"` to `.gemini/settings.json` `context.fileName` |
| Copilot Chat | Optional managed copy (`sync --copilot-copy`), hash-verified |

`sync --adopt` wraps an existing `CLAUDE.md` without deleting a single line of
your content. Run `sync` twice — the second run changes nothing.

## 📏 Rules

| Rule | Severity | Catches |
| --- | --- | --- |
| `dead-path` | error | backtick paths that no longer exist |
| `dead-command` | error | `npm run x` / `make x` that is not defined |
| `codex-budget-overflow` | error | instruction chain over 32 KiB (silently truncated by Codex) |
| `stub-broken` | error | edited/missing `@AGENTS.md` import or tampered managed copy |
| `sprawl-duplicate` | error | another instruction file ≥70% identical to `AGENTS.md` |
| `secret-like` | error | private keys / long API tokens committed into instructions |
| `claude-unmanaged` | warning | hand-written `CLAUDE.md` Claude reads instead of your source |
| `gemini-unwired` | warning | Gemini detected but not pointed at `AGENTS.md` |
| `claude-length-warn` | warning | `CLAUDE.md` beyond ~200 lines |
| `todo-rot` | warning | TODO/FIXME crust agents act on literally |
| `absolute-path-portability` | warning | `/Users/…` / `C:\…` paths that break elsewhere |

Severities configurable in `agentsmd.config.json`; `fail-on` sets the CI gate.

## 🤖 GitHub Action

```yaml
- uses: daichunghy/agentsmd@v0.1.0-alpha.2
  with:
    fail-on: error        # error | warning | never
    badge-write: false    # commit score.json to gh-pages for a badge
```

No GitHub Marketplace listing. Pin `@v0.1.0-alpha.2` or a commit SHA.
Annotations on the exact lines, `score` output, canonical `score.json`.
Optional `config` input; default is repo-root `agentsmd.config.json`.
when present. See [GitHub Action usage](docs/github-action-usage.md) for
PR checks, a weekly cron example, and pinning notes.

## 🆚 Existing tools

| Capability | agents-lint | agent-sync | aicfg | @reaatech kit | **agentsmd** |
| --- | --- | --- | --- | --- | --- |
| Stale-path/command lint | ✅ | — | partial | partial | ✅ |
| Wiring verification (doctor) | — | — | — | — | ✅ |
| Sprawl (duplicate file) detection | — | — | — | — | ✅ |
| Content-hash managed copies | — | — | — | — | ✅ |
| Deterministic score + schema | — | — | — | — | ✅ |
| Zero-dependency CLI | ✅ | — | — | — | ✅ |

## 🗺️ Roadmap

- v0.1 — lint / doctor / sync / score / init / Action (this release)
- v0.2 — registry + leaderboard of AGENTS.md health
- later — Cursor rules migration, MCP mode

## 🤝 Contributing

`npm run verify` must pass (typecheck, build, action bundle, tests,
golden fixtures, determinism, parity, process gates). MIT.

- [Contributing](.github/CONTRIBUTING.md)
- [Code of conduct](.github/CODE_OF_CONDUCT.md)
- [Security](.github/SECURITY.md)
- [Changelog](CHANGELOG.md)
- [GitHub Action usage](docs/github-action-usage.md)
- [Example config](docs/examples/agentsmd.config.json)
