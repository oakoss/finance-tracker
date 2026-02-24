---
paths:
  - '**/*.test.ts'
  - '**/*.test.tsx'
  - test/**/*
---

# Testing Rules

- Vitest globals are enabled — no need to import `describe`, `it`, `expect`.
- `vitest.config.ts` is separate from `vite.config.ts` to avoid loading Nitro/TanStack Start in tests.
- Test setup file: `test/setup.ts` (cleanup, jest-dom matchers).
- Tests needing Node-only APIs (e.g., `crypto`) should add `// @vitest-environment node` at the top of the file.

## Coverage scope

Coverage is collected for `src/lib/**`, `src/configs/**`, and `src/hooks/**`. Auth, email, Nitro plugins, routes, and components are excluded (need integration/E2E tests).

## What to unit test

Focus on pure functions and utilities: i18n formatting, env validation, hash determinism, cookie serialization, class merging (`cn`), error ID types.

See `docs/development/testing.md` for the full coverage scope and E2E plan.
