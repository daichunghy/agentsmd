# GitHub Action usage

The Action lints instruction files, emits workflow-command annotations,
and writes a canonical score report. It does not run `sync`.

Config is auto-loaded from repo-root `agentsmd.config.json` when that
file exists. Optional input `config` points at another repository-relative
JSON file.

## Inputs

| Input | Default | Values |
| --- | --- | --- |
| `fail-on` | `error` | `error`, `warning`, `never` |
| `badge-write` | `false` | `true` writes `score.json` to `gh-pages` on `main`/`master` |
| `config` | (empty) | repository-relative JSON path; empty uses `agentsmd.config.json` |

## Outputs

| Output | Meaning |
| --- | --- |
| `score` | 0–100 integer |
| `report` | Path to `agentsmd-out/score.json` |

## Pull request check

```yaml
name: agentsmd
on:
  pull_request:
  push:
    branches: [main]

permissions:
  contents: read

jobs:
  instruction-health:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: daichunghy/agentsmd@v0.1.0-alpha.4
        with:
          fail-on: error
          badge-write: false
```

Pin the tag or a commit SHA. There is no GitHub Marketplace listing.

### Custom config file

Point `config` at any repository-relative JSON file when the default
repo-root `agentsmd.config.json` is not what the job should load. The
following consumer workflow lints with a stricter ruleset kept outside the
repo root:

```yaml
jobs:
  instruction-health-strict:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: daichunghy/agentsmd@v0.1.0-alpha.4
        with:
          fail-on: error
          config: .github/agentsmd.strict.json
```

The custom filename is loaded as-is: a missing file fails the job closed
rather than silently falling back to defaults, and its `rules` severities
change which findings can fail the check.

## Weekly rot (copy into *your* repo)

Silent drift happens between PRs. Copy
[`docs/examples/weekly-rot.yml`](examples/weekly-rot.yml) to
`.github/workflows/agentsmd-weekly.yml` in the repository you want to
score. Do not enable a cron that posts to `daichunghy/agentsmd` unless
you intend this repo to self-score on a schedule.

## Badge (optional)

With `badge-write: true` on the default branch, the Action force-pushes
`score.json` to `gh-pages`. Point shields.io at that file as an endpoint
badge. The Action needs `contents: write` for that job only.

## Local equivalent

```sh
npx @daichunghy/agentsmd doctor
npx @daichunghy/agentsmd lint --json
npx @daichunghy/agentsmd score --json
```

`npx` resolves the published `0.1.0-alpha.4` package. From a clone,
`npm run build` then `node dist/main.js` is the local equivalent.
