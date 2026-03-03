# Authentication

[Back to E2E Testing](README.md)

## Authentication via storageState

Auth is handled by a Playwright setup project that logs in once and
saves session state to `playwright/.auth/user.json`. Authenticated
test projects depend on the setup project and reuse the saved
storageState.

A `db-setup` project runs before auth setup to ensure the E2E user
and seed data exist in the database. This prevents cascade failures
when the DB is empty (e.g., after `docker:reset && db:migrate`).
The seed functions are idempotent — repeated runs are safe.

**Important:** Add `playwright/.auth/` to `.gitignore` — these
files contain cookies and session tokens that must not be committed.

**`e2e/setup/auth.setup.ts`**: runs once before authenticated tests:

```ts
import { expect, test as setup } from '@playwright/test';

import { E2E_EMAIL, E2E_PASSWORD } from '~e2e/fixtures/constants';

setup('authenticate', async ({ page }) => {
  await page.goto('/sign-in');
  // Button is disabled until hydrated — wait for enabled to ensure
  // React event handlers are attached before filling inputs.
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeEnabled();
  await page.getByLabel('Email').fill(E2E_EMAIL);
  await page.getByLabel('Password', { exact: true }).fill(E2E_PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL('/dashboard', { timeout: 15_000 });
  await expect(page.getByRole('heading', { name: /welcome/i })).toBeVisible();
  await page.context().storageState({ path: 'playwright/.auth/user.json' });
});
```

**`playwright.config.ts`** (projects use `grep`/`grepInvert` on
`@authenticated` to split auth vs public tests):

```ts
// Strip defaultBrowserType so iPhone uses Chromium instead of WebKit
// (avoids requiring a WebKit install). Pixel already defaults to Chromium.
const { defaultBrowserType: _iphone, ...iPhone } = devices['iPhone 15 Pro Max'];
const { defaultBrowserType: _pixel, ...pixel } = devices['Pixel 7'];

projects: [
  { name: 'db-setup', testDir: 'e2e/setup', testMatch: 'db.setup.ts' },
  { dependencies: ['db-setup'], name: 'setup', testDir: 'e2e/setup', testMatch: 'auth.setup.ts' },

  // Desktop
  {
    dependencies: ['setup'],
    grep: /@authenticated/,
    name: 'chromium:authenticated',
    use: { ...devices['Desktop Chrome'], storageState: 'playwright/.auth/user.json' },
  },
  {
    dependencies: ['db-setup'],
    grepInvert: /@authenticated/,
    name: 'chromium:public',
    use: { ...devices['Desktop Chrome'], storageState: { cookies: [], origins: [] } },
  },

  // iPhone (Chromium with iPhone viewport/UA)
  {
    dependencies: ['setup'],
    grep: /@authenticated/,
    name: 'iphone:authenticated',
    use: { ...iPhone, storageState: 'playwright/.auth/user.json' },
  },
  {
    dependencies: ['db-setup'],
    grepInvert: /@authenticated/,
    name: 'iphone:public',
    use: { ...iPhone, storageState: { cookies: [], origins: [] } },
  },

  // Pixel (Chromium with Pixel viewport/UA)
  {
    dependencies: ['setup'],
    grep: /@authenticated/,
    name: 'pixel:authenticated',
    use: { ...pixel, storageState: 'playwright/.auth/user.json' },
  },
  {
    dependencies: ['db-setup'],
    grepInvert: /@authenticated/,
    name: 'pixel:public',
    use: { ...pixel, storageState: { cookies: [], origins: [] } },
  },
],
```

For focused desktop-only runs: `pnpm test:e2e -- --project=chromium:public --project=chromium:authenticated`

To test unauthenticated flows within an authenticated test file,
override at the describe level:

```ts
test.describe('redirects when signed out', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('redirects to sign-in', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/sign-in/);
  });
});
```

**Multiple roles:** Create separate setup tests per role (admin,
user) saving to distinct files (`admin.json`, `user.json`). Apply
with `test.use({ storageState })` per describe block.

**Two roles in one test:** When testing interactions between two
authenticated users (e.g., admin approves a request created by a
regular user), create concurrent browser contexts:

```ts
test('admin approves user request', async ({ browser }) => {
  const userCtx = await browser.newContext({
    storageState: 'playwright/.auth/user.json',
  });
  const adminCtx = await browser.newContext({
    storageState: 'playwright/.auth/admin.json',
  });
  const userPage = await userCtx.newPage();
  const adminPage = await adminCtx.newPage();

  // User creates a request
  await userPage.goto('/requests');
  await userPage.getByRole('button', { name: 'New Request' }).click();
  // ...

  // Admin approves it
  await adminPage.goto('/admin/requests');
  await adminPage.getByRole('button', { name: 'Approve' }).click();
  // ...

  await userCtx.close();
  await adminCtx.close();
});
```

**Per-worker accounts for parallel isolation:** When parallel tests
modify shared server-side state (e.g., deleting accounts), a single
shared session causes conflicts. Use `parallelIndex` to give each
worker its own account:

```ts
import path from 'node:path';

import { test as setup } from '@playwright/test';

setup('authenticate', async ({ page }, testInfo) => {
  const id = testInfo.parallelIndex;
  await page.goto('/sign-in');
  await page.getByLabel('Email').fill(`e2e-worker-${id}@test.local`);
  await page.getByLabel('Password', { exact: true }).fill('E2ePassword1!');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('/dashboard');

  const authFile = path.resolve(
    testInfo.project.outputDir,
    `.auth/worker-${id}.json`,
  );
  await page.context().storageState({ path: authFile });
});
```

Auth files are written to `testInfo.project.outputDir` because
Playwright automatically deletes `outputDir` before each test run,
preventing stale auth files from accumulating.

This requires seeding one E2E user per worker. Not needed yet
(our tests don't modify shared state in parallel), but planned
for when CRUD tests run concurrently.

**Session storage:** `storageState` persists cookies and localStorage.
Session storage is not persisted;
inject it via `addInitScript()`:

```ts
// Save session storage from one context
const sessionData = await page.evaluate(() => JSON.stringify(sessionStorage));

// Inject into a new context
const newContext = await browser.newContext({
  storageState: 'playwright/.auth/user.json',
});
await newContext.addInitScript((data) => {
  for (const [key, value] of Object.entries(JSON.parse(data))) {
    sessionStorage.setItem(key, value as string);
  }
}, sessionData);
```

**Sign-out tests:** Do not rely on storageState for tests that sign
out. Sign-out invalidates the server-side session, making shared
storageState unreliable. Instead, each sign-out test should sign in
via UI to create its own fresh session.

**Context emulation:** `browser.newContext()` accepts emulation
options beyond `storageState`:

```ts
const context = await browser.newContext({
  locale: 'de-DE',
  timezoneId: 'Europe/Berlin',
  geolocation: { latitude: 52.52, longitude: 13.405 },
  permissions: ['geolocation'],
  colorScheme: 'dark',
  // Or use a device profile:
  ...devices['iPhone 15 Pro Max'],
});
```

**Additional context options:**

```ts
const context = await browser.newContext({
  // Network & security
  offline: true, // simulate network loss
  ignoreHTTPSErrors: true, // accept self-signed certs (staging)
  httpCredentials: {
    // HTTP Basic Auth (staging gate)
    username: 'staging',
    password: 'secret',
  },
  bypassCSP: true, // allow addInitScript when strict CSP is set
  extraHTTPHeaders: {
    // sent with every request in this context
    'x-debug': '1',
    'x-feature-flag': 'new-dashboard',
  },

  // Device & rendering
  isMobile: true, // mobile UA + touch events (without full device spread)
  deviceScaleFactor: 2, // HiDPI/retina rendering
  userAgent: 'Custom UA string', // override user agent
  javaScriptEnabled: false, // verify SSR output renders without JS
});
```

These options can also be set globally via `use: {}` in
`playwright.config.ts` or per-describe with `test.use({})`.

**Runtime viewport and media changes:**

```ts
// Resize viewport mid-test to verify responsive breakpoints
await page.setViewportSize({ width: 375, height: 812 });
await expect(page.getByRole('button', { name: 'Menu' })).toBeVisible();

await page.setViewportSize({ width: 1280, height: 720 });
await expect(page.getByRole('navigation')).toBeVisible();

// Emulate print media (e.g., account statement print view)
await page.emulateMedia({ media: 'print' });
await expect(page).toHaveScreenshot('statement-print.png');

// Emulate reduced motion preference
await page.emulateMedia({ reducedMotion: 'reduce' });
```

Manually created contexts must be explicitly closed with
`ctx.close()`. The auto-provided `context` fixture is cleaned up
automatically by Playwright.

Import `test` and `expect` from `@playwright/test` directly.
Import `waitForHydration` from `~e2e/fixtures` only when needed
(see hydration section in README.md). Future custom fixtures
(e.g., `authenticated.fixture.ts`) will export an extended `test`
from `e2e/fixtures/`.

## Page Object Model (POM)

Encapsulate page-specific locators and actions in classes to keep
tests DRY. Integrate POMs as Playwright fixtures:

```ts
// e2e/fixtures/accounts-page.ts
import type { Page } from '@playwright/test';

export class AccountsPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/accounts');
  }

  async createAccount(name: string) {
    await this.page.getByRole('button', { name: 'Add Account' }).click();
    await this.page.getByLabel('Account Name').fill(name);
    await this.page.getByRole('button', { name: 'Create' }).click();
  }

  account(name: string) {
    return this.page.getByRole('row', { name });
  }
}
```

```ts
// e2e/fixtures/accounts.fixture.ts
import { test as base } from '@playwright/test';

import { AccountsPage } from '~e2e/fixtures/accounts-page';

export const test = base.extend<{ accountsPage: AccountsPage }>({
  accountsPage: async ({ page }, use) => {
    await use(new AccountsPage(page));
  },
});
export { expect } from '@playwright/test';
```

```ts
// e2e/accounts/crud.test.ts
import { expect, test } from '~e2e/fixtures/accounts.fixture';

test('creates an account', async ({ accountsPage }) => {
  await accountsPage.goto();
  await accountsPage.createAccount('Chase Sapphire');
  await expect(accountsPage.account('Chase Sapphire')).toBeVisible();
});
```

**Role-aware POM fixtures:** Combine `storageState` with a POM
in a single fixture for pre-authenticated page access:

```ts
export const test = base.extend<{
  adminAccountsPage: AccountsPage;
}>({
  adminAccountsPage: async ({ browser }, use) => {
    const ctx = await browser.newContext({
      storageState: 'playwright/.auth/admin.json',
    });
    const page = await ctx.newPage();
    await use(new AccountsPage(page));
    await ctx.close();
  },
});
```

Introduce POMs when a page's selectors appear in 3+ tests. For
simpler pages, inline locators are fine.
