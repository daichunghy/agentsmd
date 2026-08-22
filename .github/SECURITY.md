# Security

Please report vulnerabilities **privately**:

https://github.com/daichunghy/agentsmd/security/advisories/new

Do not file a public issue for a security report.

## Supported versions

| Version | Supported |
| --- | --- |
| `0.1.0-alpha.x` | yes |
| other | no |

There is no stable release yet. Fixes land on `main` and in the next
alpha tag.

## Scope

agentsmd reads instruction files and writes wiring stubs. Reports that
involve secret-like content already stored in a repository's `AGENTS.md`
are not vulnerabilities in this tool unless agentsmd leaks or exfiltrates
that content itself.
