# agentsmd Go-To-Market Strategy

**Date:** 2026-08-22
**Status:** Active strategy
**Inputs:** GitHub API metrics of viral comparables (2026-08-22), Exa
research on launch mechanics, README structural analysis, agentsmd MVP
design spec (same date).

## 1. Research findings

### 1.1 Comparable viral repos (structure-similar CLI dev tools)

| Repo | Stars | Age | Rate | Signal |
| --- | --- | --- | --- | --- |
| davila7/claude-code-templates | 30,324 | ~13.5 mo | ~2,250/mo | Fastest; exact niche (Claude Code tooling) |
| anomalyco/opencode | ~200,066 | ~16 mo | enormous | Agent-tooling wave is still accelerating |
| Aider-AI/aider | 48,395 | ~40 mo | ~1,200/mo | Terminal AI staple |
| astral-sh/ruff | 49,269 | ~48 mo | ~1,030/mo | "Linter done right" playbook |
| yamadashy/repomix | 28,000 | ~25 mo | ~1,120/mo | Adjacent single-purpose repo tool |
| gitleaks/gitleaks | 28,897 | ~8.5 yr | steady | Classic single-purpose CLI |

### 1.2 README patterns shared by the viral set

- 7–24 badges (CI, npm version, license, stars, contributors).
- Install one-liner within the first ~50–70 lines.
- Emoji-headed sections in the order Features → Quick Start → Usage.
- Community surface early (Discussions on, or Discord link).
- Continuous "New:" announcement blocks near the top (repomix).
- Comparison/positioning content inside the repo (read by humans and
  quoted by LLMs answering "what should I use").

### 1.3 Launch mechanics (what actually moved these repos)

- **Reddit persistence beats launch-day luck.** Repomix's first post got
  3 likes; growth came from daily, genuine answers to people with the
  same problem, mentioning the tool where relevant (author's own
  retrospective).
- **Show HN playbook:** plain factual title (`Show HN: agentsmd – lint,
  sync and score AI agent instruction files`); top comment tells the
  real story and names a limitation unprompted; weekday mornings US
  time; author stays in-thread 2–3 hours answering everything.
- **Channel priority for repo-conversion tools:** awesome lists (one PR,
  permanent placement) > package registries/directories > GitHub topics
  (20 max, lowercase-hyphenated) > Reddit/HN > dev.to. "Fix the
  destination first, ship something runnable, distribute in weekly
  waves."
- **Trademark check before growth** (Repopack→Repomix rename at 1k
  stars). "agentsmd" is a generic compound of the open standard's name;
  low risk, but never brand as "official" anything.

## 2. Strategy phases

### Phase 0 — Destination polish (runs during build weeks 1–3)

1. npm `agentsmd` published as `0.1.0-alpha` in week 1 (name hold).
2. README v1: hero demo (asciinema or GIF ≤ 15 s), `npx agentsmd doctor`
   in the first screen, badges, emoji sections, comparison table vs
   agents-lint / agent-sync / aicfg / @reaatech kit, wiring guides per
   tool (Claude Code / Gemini CLI / Copilot pages — these target the
   exact search queries people already type).
3. Repo hygiene: 20 topics, Discussions on, issue forms + 3
   good-first-issues at launch, social preview image, MIT, CI badge
   green before any post.
4. GitHub Action published to the Marketplace (`agentsmd`) — marketplace
   is its own discovery surface.

### Phase 1 — Launch (target 2026-09-12, Tue–Thu, US morning)

1. Show HN with honest top comment (named limitation: "single
   maintainer, Windows CI untested, registry not built yet").
2. Reddit: r/ClaudeAI ("ending the CLAUDE.md sprawl" angle — the exact
   pain those threads discuss), r/Cursor, r/ChatGPTCoding. Different
   angles per subreddit, no copy-paste.
3. dev.to article: "Declare one source, verify the wiring" (canonical
   here; dev.to is our blog until a domain exists).
4. awesome-list PRs: awesome-claude-code, awesome-agents-md lists,
   awesome-ai-cli (follow each list's contribution rules; expect
   review lag).
5. X/Twitter thread with 15 s demo clip; tag nothing artificially.

### Phase 2 — Persistence (weeks 2–6 after launch)

1. Daily 15-minute Reddit protocol: search mentions of
   "CLAUDE.md AGENTS.md sync/sprawl/drift/stale", answer genuinely,
   mention agentsmd only where it truly fits (repomix-proven method).
2. Every issue answered < 24 h; each accepted request shipped in
   visible weekly releases (release notes = weekly content).
3. v0.2 registry + leaderboard; launch post #2: "State of AGENTS.md"
   data story from registry data (earned-media engine).
4. Weekly waves, one channel at a time; re-audit what AI search engines
   say about "sync CLAUDE.md and AGENTS.md" monthly.

### Phase 3 — Program application (gate, not date)

Apply to Codex for Open Source when ALL hold: 300+ stars, 100+ badge
repos, ≥1 external contributor PR merged, zero honesty violations.
Application narrative: instruction lane (agentsmd) + enforcement lane
(PatchGate), one maintainer, one thesis.

### Anti-goals (never do)

- No star-begging DMs, no bought stars/promotion, no fake activity or
  sock-puppet accounts, no "official standard" claims, no OpenAI
  affiliation implications, no inflating adoption numbers in posts.

## 3. Execution order (from today)

1. Implementation plan (writing-plans) for build weeks 1–3 → commit.
2. Week 1 build: scaffold, CI, parser, discovery, targets, lint core,
   npm alpha publish, topics + badges + README skeleton.
3. Weeks 2–3 per spec §12; README hero + comparison table before any
   distribution.
4. Launch per Phase 1; then Phase 2 cadence.
