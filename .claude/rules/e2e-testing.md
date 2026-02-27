---
paths:
  - e2e/**/*
  - playwright.config.ts
---

# E2E Testing Rules

- Use Playwright's test runner, not Vitest. Import `test`/`expect`
  from `@playwright/test`. Import helpers from `~e2e/fixtures`.
- Locator priority: `getByRole` > `getByText` > `getByLabel` >
  `getByPlaceholder` > `getByAltText` > `getByTitle` > `getByTestId`.
  Never use CSS selectors or XPath.
- Password fields require `getByLabel('Password', { exact: true })`
  because the toggle button's aria-label matches without `exact`.
- Use `fill()` for text input. Only use `pressSequentially()` when
  the page has per-keystroke handling (autocomplete, debounce).
- Prefer auto-retrying assertions (`toBeVisible`, `toHaveURL`,
  `toHaveText`) over manual waits. Never use `waitForTimeout`.
- Use `test.step()` to break tests into 3-5 named phases.
- Tag test groups: `@smoke`, `@auth`, `@a11y`, `@crud`.
- Sign-out tests must sign in via UI (not storageState) to create
  their own session. Sign-out invalidates server sessions.
- A11y tests use `AxeBuilder` from `@axe-core/playwright` with
  `withTags(['wcag2aa'])`. Test both light and dark mode.
- Use `{ force: true }` only when Playwright's actionability
  detection is wrong, never to paper over real issues.

See `docs/development/e2e/` for the full guide.
