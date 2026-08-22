# agentsmd

One source of truth for AI agent instructions — linted, wired, scored.

```sh
npx agentsmd doctor
```

`agentsmd` keeps `AGENTS.md` the single source of truth for the AI coding
agents that work on your repository (Codex, Cursor, GitHub Copilot agent,
and — with one generated stub — Claude Code; Gemini CLI via one config
line), then verifies the wiring, detects drift and sprawl, and scores your
instruction health.

Status: pre-release (`0.1.0-alpha`). MIT.
