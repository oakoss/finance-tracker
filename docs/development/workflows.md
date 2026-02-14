# Workflows

This document summarizes GitHub Actions workflows and conventions.

## Conventions

- Pin action SHAs (with version comments).
- Use least-privilege permissions.
- Set concurrency to cancel duplicate runs per branch/PR.
- Use pnpm for project scripts; do not use npm in this repo.

## Node Version (fnm)

Use `fnm` with the `.nvmrc` version for local development.

Install/setup: <https://github.com/Schniz/fnm>

```bash
fnm use
```

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true
```

## CI (`.github/workflows/ci.yml`)

- Runs static analysis via `.github/actions/static-analysis`.
- Docs-only changes run `format:check` + `lint:md` only.
- Unit/E2E jobs are scaffolded but disabled.

## CodeQL (`.github/workflows/codeql.yml`)

- Monthly scan (first day of month).
- `security-extended` query suite for JS/TS.
- `build-mode: none`.

## Dependency Review (`.github/workflows/dependency-review.yml`)

- Runs only when dependency files change.
- Fails on high severity.
