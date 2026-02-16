# Testing

Testing strategy and commands.

CI policy and automation decisions are defined in
`docs/adr/0011-ci-and-renovate.md`.

## Prerequisites

- Copy `.env.example` to `.env` for local runs.

## Unit Tests

- Test runner: Vitest (`pnpm test`).
- Use pnpm for test commands; do not use npm in this repo.
- Unit tests are not implemented yet.
- CI has a scaffolded unit test job (disabled).

## E2E Tests

- E2E tests are not configured yet.
- CI has a scaffolded E2E test job (disabled).
