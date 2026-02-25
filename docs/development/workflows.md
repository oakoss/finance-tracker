# Workflows

This document summarizes GitHub Actions workflows and conventions.

For the rationale and policy decisions, see
`docs/adr/0011-ci-and-renovate.md`.

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
- Unit tests run on every PR (required to pass).
- E2E tests run on every PR (not required to pass).

## CodeQL (`.github/workflows/codeql.yml`)

- Monthly scan (first day of month).
- `security-extended` query suite for JS/TS.
- `build-mode: none`.

## Dependency Review (`.github/workflows/dependency-review.yml`)

- Runs only when dependency files change.
- Fails on high severity.

## Git Hooks (Lefthook)

Local git hooks are managed by [Lefthook](https://github.com/evilmartians/lefthook)
via `lefthook.yml`:

- **`pre-commit`** (runs in parallel):
  - `pnpm typecheck`
  - `pnpm lint` (with `stage_fixed: true` for auto-fix)
  - `pnpm lint:md` (with `stage_fixed: true`)
  - `pnpm format` (with `stage_fixed: true`)
- **`commit-msg`**: commitlint validates conventional commit format.

`stage_fixed: true` re-stages auto-fixed files automatically.
