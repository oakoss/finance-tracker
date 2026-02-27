# Debugging

[Back to E2E Testing](README.md)

## Playwright Inspector

Step through tests interactively:

```bash
# Launch Inspector for all tests
pnpm test:e2e -- --debug

# Debug a specific test file at a specific line
pnpm test:e2e -- e2e/auth/sign-in.test.ts:15 --debug

# Debug a specific project
pnpm test:e2e -- --project=chromium:public --debug
```

The Inspector provides a step-through toolbar, actionability logs
(visibility, stability, enablement checks), and a "Pick Locator"
UI for live locator editing and highlighting.

**Breakpoints in test code:**

```ts
// Insert a breakpoint — opens Inspector at this point
await page.pause();
```

Remove `page.pause()` before committing — it hangs CI. Guard with
`if (!process.env.CI)` during development if needed.

## Visual debugging

```ts
// playwright.config.ts — see what the test does in a real browser
use: {
  headless: false,
  launchOptions: { slowMo: 500 }, // ms between each action
},
```

**One-off headed run** — see the browser without changing config:

```bash
pnpm test:e2e -- --headed e2e/auth/sign-in.test.ts
```

## Verbose logging

```bash
# Print all internal Playwright API calls
DEBUG=pw:api pnpm test:e2e -- e2e/auth/sign-in.test.ts

# Diagnose browser launch failures (missing deps, sandbox errors)
DEBUG=pw:browser pnpm test:e2e -- e2e/auth/sign-in.test.ts
```

## Trace Viewer

Primary tool for debugging CI failures:

```bash
# Open a trace file from CI artifacts
npx playwright show-trace trace.zip

# Force trace collection for a specific run
pnpm test:e2e -- --trace on
```

Traces contain DOM snapshots at each action, an action timeline,
console messages, network request/response data, and an
Attachments tab for custom data added via `testInfo.attach()`.

**Trace config values** (`use.trace` in `playwright.config.ts`):

- `'off'` — no traces (default locally)
- `'on'` — trace every test (large files, use sparingly)
- `'retain-on-failure'` — trace all, keep only failures
- `'on-first-retry'` — trace only on first retry (our CI default)
- `'on-all-retries'` — trace on every retry attempt

**Online viewer:** Upload a `trace.zip` to
[trace.playwright.dev](https://trace.playwright.dev) to view
traces without installing Playwright locally. The trace is
processed entirely in-browser; no data leaves your machine.

## HTML report

Browse pass/fail results, filter by browser and status, drill
into step-by-step failures:

```bash
npx playwright show-report
```

## Artifact security

Traces, HTML reports, and console logs may contain session tokens,
auth headers, and source code. Upload CI artifacts only to trusted
stores. This is especially relevant because our auth setup writes
session tokens and trace files capture full network
request/response data including cookies.

## VS Code integration

The Playwright VS Code extension supports right-click "Debug Test",
live locator highlighting, and the "Pick Locator" panel for
real-time selector editing.
