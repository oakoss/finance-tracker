# Network & Time

[Back to E2E Testing](README.md)

## Clock / time control

Use `page.clock` to control time in tests with date-dependent UI
(transaction dates, session timeouts, scheduled summaries).

**Pin `Date.now()` for date assertions** (timers still run
normally):

```ts
// Fix the current date — useful for asserting formatted dates
await page.clock.setFixedTime(new Date('2025-03-15T10:00:00'));
await page.goto('/transactions');
await expect(page.getByText('March 15, 2025')).toBeVisible();
```

**Fake timers for session expiry / debounce** (full clock
override):

```ts
// install() must be called BEFORE any other clock methods
await page.clock.install({ time: new Date('2025-03-15T10:00:00') });
await page.goto('/dashboard');

// Fast-forward 30 minutes to trigger session timeout
await page.clock.fastForward('30:00');
await expect(page).toHaveURL(/sign-in/);
```

**Manual timer control:**

```ts
await page.clock.install({ time: new Date('2025-03-15T10:00:00') });
await page.goto('/dashboard');

// Advance exactly 1 second — fires any timers in that window
await page.clock.runFor(1_000);

// Update system time without firing timers
await page.clock.setSystemTime(new Date('2025-03-15T10:30:00'));
```

`install()` overrides: `Date`, `setTimeout`, `clearTimeout`,
`setInterval`, `clearInterval`, `requestAnimationFrame`,
`cancelAnimationFrame`, `requestIdleCallback`,
`cancelIdleCallback`, `performance`, `Event.timeStamp`.

## Global HTTP headers

Set `extraHTTPHeaders` at the project level in
`playwright.config.ts` to attach headers to every browser request
(debug flags, feature flags, auth tokens):

```ts
// playwright.config.ts
use: {
  extraHTTPHeaders: {
    'x-debug': '1',
  },
},
```

This applies to all navigations and fetches in the browser
context. For API-only headers, use the `request` fixture or
`apiRequest.newContext()` instead (see below).

## API testing in E2E

Use the `request` fixture or `page.request` for API calls within
E2E tests. The `baseURL` from `playwright.config.ts` applies to
the `request` fixture too, so relative paths like
`request.get('/api/accounts')` work without repeating the base URL.

**Verifying server state after UI actions:**

```ts
test('delete account via UI, verify via API', async ({ page, request }) => {
  await page.goto('/accounts');
  await page.getByRole('button', { name: 'Delete' }).click();
  await page.getByRole('button', { name: 'Confirm' }).click();

  const response = await request.get('/api/accounts');
  await expect(response).toBeOK(); // asserts 2xx (covers 200, 201, etc.)
  const accounts = await response.json();
  expect(accounts).toHaveLength(0);
});
```

**Test data setup/teardown with `beforeAll`/`afterAll`:**

Create and clean up data via API instead of the UI for faster,
more reliable CRUD test isolation:

```ts
let accountId: string;

test.beforeAll(async ({ request }) => {
  const response = await request.post('/api/accounts', {
    data: { name: 'Test Account', type: 'checking' },
  });
  await expect(response).toBeOK();
  accountId = (await response.json()).id;
});

test.afterAll(async ({ request }) => {
  await request.delete(`/api/accounts/${accountId}`);
});

test('displays the account', async ({ page }) => {
  await page.goto('/accounts');
  await expect(page.getByText('Test Account')).toBeVisible();
});
```

**Cookie sharing:** The `request` fixture shares cookies with the
browser context when accessed via `page.request`, so authenticated
API calls work automatically.

**Isolated API contexts:** Use `playwright.request.newContext()`
for API calls as a different user, with custom headers, or through
a proxy. Always call `.dispose()` when done; standalone contexts
are not auto-cleaned like fixtures:

```ts
import { request as apiRequest } from '@playwright/test';

test('admin API returns 403 for regular user', async () => {
  const ctx = await apiRequest.newContext({
    baseURL: 'http://localhost:3000',
    extraHTTPHeaders: { Authorization: 'Bearer user-token' },
  });

  const response = await ctx.get('/api/admin/users');
  expect(response.status()).toBe(403);

  await ctx.dispose(); // required — release connections
});
```

**In-memory auth transfer:** Authenticate via API, then pass the
session to a browser context without saving to disk:

```ts
setup('authenticate via API', async ({ request, browser }) => {
  await request.post('/api/auth/sign-in/email', {
    data: { email: 'user@test.com', password: 'password' },
  });
  // Transfer cookies from API context to browser context
  const state = await request.storageState();
  const context = await browser.newContext({ storageState: state });
  // context is now authenticated
  await context.close();
});
```

**API-first login (faster alternative to UI login):**

If the auth system exposes a JSON endpoint, the setup project can
authenticate via API instead of navigating the UI:

```ts
setup('authenticate', async ({ request }) => {
  await request.post('/api/auth/sign-in/email', {
    data: {
      email: process.env.E2E_USER_EMAIL,
      password: process.env.E2E_USER_PASSWORD,
    },
  });
  await request.storageState({ path: 'playwright/.auth/user.json' });
});
```

## Network interception

Beyond the basic `route.fulfill()` shown in "Avoid third-party
dependencies," Playwright offers three route handler methods:

```ts
// Fulfill — return a mock response (no network call)
await page.route('**/api/accounts', (route) =>
  route.fulfill({ json: [{ id: '1', name: 'Checking' }] }),
);

// Abort — block a resource type to speed tests
await page.route('**/*.{png,jpg,svg}', (route) => route.abort());

// Continue — forward with modifications (e.g., strip a header)
await page.route('**/api/**', (route) =>
  route.continue({ headers: { ...route.request().headers(), 'x-debug': '1' } }),
);
```

**Modify live responses with `route.fetch()`:**

```ts
await page.route('**/api/accounts', async (route) => {
  const response = await route.fetch();
  const json = await response.json();
  json[0].balance = -999.99; // inject edge-case value
  await route.fulfill({ response, json });
});
```

**HAR record and replay:**

```bash
# Record traffic to a HAR file
pnpm test:e2e -- --save-har=hars/api.har --save-har-glob="**/api/**"
```

```ts
// Replay recorded traffic (commit the .har alongside tests)
await page.routeFromHAR('hars/api.har', { url: '**/api/**' });
```

**Glob pattern rules** (used in `page.route()` URL patterns):

- `*` matches any characters except `/`
- `**` matches any characters including `/`
- `?` matches a **literal** question mark (not "any single char")
- `{}` for alternatives: `**/*.{png,jpg}`
- Patterns must match the **entire URL** — use RegExp for partial

**Waiting for network events:**

```ts
// Wait for a specific request/response before proceeding
const responsePromise = page.waitForResponse('**/api/accounts');
await page.getByRole('button', { name: 'Refresh' }).click();
const response = await responsePromise;
expect(response.status()).toBe(200);
```

**Service worker caveat:** If Mock Service Worker (MSW) or any
Service Worker is active, it intercepts requests **before**
`page.route()` sees them, making route handlers silently
ineffective. Use `serviceWorkers: 'block'` in the browser context
to disable them during E2E tests.

**Context-level routing:** `page.route()` only covers the page
it's called on. For popups opened via `window.open()`, set routes
on `context.route()` instead.

**Network lifecycle events:** Beyond `waitForResponse`, the page
emits `requestfinished` and `requestfailed` events for confirming
fire-and-forget requests or detecting network errors:

```ts
// Confirm a fire-and-forget analytics request completed
const finished = page.waitForEvent('requestfinished', (req) =>
  req.url().includes('/api/analytics'),
);
await page.getByRole('button', { name: 'Track' }).click();
await finished;

// Detect a failed network request
const failed = page.waitForEvent('requestfailed');
await page.route('**/api/data', (route) => route.abort());
await page.getByRole('button', { name: 'Load' }).click();
const req = await failed;
expect(req.failure()?.errorText).toBeTruthy();
```
