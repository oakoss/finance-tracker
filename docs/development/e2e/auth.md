# Authentication

[Back to E2E Testing](README.md)

## Per-worker authentication

Each Playwright worker authenticates as its own E2E user
(`e2e-worker-{parallelIndex}@test.local`) via a worker-scoped
fixture in `e2e/fixtures/auth.ts`. This isolates server-side data
between parallel workers, preventing test interference when CRUD
tests create/delete data concurrently.

A `db-setup` project seeds all worker users and cleans their data
before any tests run. The seed functions are idempotent.

**Important:** Add `playwright/.auth/` to `.gitignore` — these
files contain cookies and session tokens that must not be committed.

**`e2e/fixtures/auth.ts`** — worker-scoped auth fixture:

```ts
import { test as base, expect } from '@playwright/test';

import {
  E2E_PASSWORD,
  E2E_USER_COUNT,
  e2eEmail,
} from '~e2e/fixtures/constants';

export const test = base.extend<{}, { workerStorageState: string }>({
  storageState: ({ workerStorageState }, use) => use(workerStorageState),

  workerStorageState: [
    async ({ browser }, use, workerInfo) => {
      const id = workerInfo.parallelIndex;

      // Guard: fail fast if workers exceed seeded user count
      if (id >= E2E_USER_COUNT) {
        throw new Error(
          `Worker ${id} exceeds E2E_USER_COUNT (${E2E_USER_COUNT}).`,
        );
      }

      const authFile = `playwright/.auth/worker-${id}.json`;

      // Pass baseURL from project config (browser.newContext doesn't inherit it)
      const baseURL = workerInfo.project.use.baseURL;
      const context = await browser.newContext(baseURL ? { baseURL } : {});
      try {
        const page = await context.newPage();
        await page.goto('/sign-in');
        await page.getByLabel('Email').fill(e2eEmail(id));
        await page.getByLabel('Password', { exact: true }).fill(E2E_PASSWORD);
        await page.getByRole('button', { name: 'Sign in' }).click();
        await expect(page).toHaveURL('/dashboard', { timeout: 15_000 });

        await context.storageState({ path: authFile });
      } finally {
        await context.close();
      }
      await use(authFile);
    },
    { scope: 'worker' },
  ],
});
export { expect } from '@playwright/test';
```

Authenticated test files import `test` and `expect` from
`~e2e/fixtures/auth` instead of `@playwright/test`:

```ts
import { expect, test } from '~e2e/fixtures/auth';
```

Public/auth test files (`e2e/auth/*.test.ts`, `e2e/demo/*.test.ts`)
keep importing from `@playwright/test` — they don't use
authenticated state or manage their own login flows.

**`playwright.config.ts`** — authenticated projects depend only on
`db-setup` (no separate `setup` project). The worker fixture handles
auth automatically:

```ts
projects: [
  { name: 'db-setup', testDir: 'e2e/setup', testMatch: 'db.setup.ts' },

  // Desktop
  {
    dependencies: ['db-setup'],
    grep: /@authenticated/,
    name: 'chromium:authenticated',
    use: { ...devices['Desktop Chrome'] },
  },
  {
    dependencies: ['db-setup'],
    grepInvert: /@authenticated/,
    name: 'chromium:public',
    use: { ...devices['Desktop Chrome'], storageState: { cookies: [], origins: [] } },
  },
  // ... iPhone and Pixel projects follow the same pattern
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

**Multiple roles:** Create separate worker fixtures per role (admin,
user) saving to distinct files. Apply with `test.use({ storageState })`
per describe block.

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

Authenticated tests import `test` and `expect` from
`~e2e/fixtures/auth`. Public tests import from `@playwright/test`.
Import `waitForHydration` from `~e2e/fixtures` only when needed
(see hydration section in README.md).

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
