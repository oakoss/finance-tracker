// @vitest-environment node
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

/**
 * Asserts every server function in `src/modules/<x>/api/*.ts` picks
 * the correct middleware. Guards two regressions:
 *
 * 1. A new finance mutation lands without `verifiedMutationMiddleware`
 *    and quietly bypasses the email-verification gate.
 * 2. An exempt self-service flow (deletion, export, preferences) gets
 *    migrated to `verifiedMutationMiddleware` and traps unverified
 *    users with no recovery path.
 *
 * `MODULE_API_DIRS` is discovered at test time by scanning
 * `src/modules/*\/api` so adding a new module (e.g., `reports/api/`)
 * is automatically covered without touching this file. When a new
 * api file is added, update the appropriate allowlist below.
 */

function discoverApiDirs(): string[] {
  const modulesRoot = 'src/modules';
  return readdirSync(modulesRoot)
    .map((name) => path.join(modulesRoot, name, 'api'))
    .filter((dir) => existsSync(dir) && statSync(dir).isDirectory());
}

/**
 * Files that must stay on plain `authMiddleware`. Everything else in
 * `api/` must use `verifiedMutationMiddleware` unless it's in the
 * no-middleware allowlist below.
 */
const AUTH_ONLY_FILES = new Set<string>([
  // Reads
  'src/modules/accounts/api/get-credit-card-catalog.ts',
  'src/modules/accounts/api/list-accounts.ts',
  'src/modules/auth/api/get-deletion-request.ts',
  'src/modules/auth/api/get-linked-accounts.ts',
  'src/modules/budgets/api/get-budget-vs-actual.ts',
  'src/modules/budgets/api/list-budget-lines.ts',
  'src/modules/budgets/api/list-budget-periods.ts',
  'src/modules/categories/api/list-categories.ts',
  'src/modules/imports/api/list-import-rows.ts',
  'src/modules/imports/api/list-imports.ts',
  'src/modules/payees/api/list-payees.ts',
  'src/modules/preferences/api/get-preferences.ts',
  'src/modules/rules/api/list-merchant-rules.ts',
  'src/modules/rules/api/preview-apply-merchant-rule.ts',
  // Note: apply-merchant-rule intentionally omitted — it's a mutation.
  'src/modules/transactions/api/list-tags.ts',
  'src/modules/transactions/api/list-transactions.ts',
  // Exempt mutations (GDPR + unverified-recoverable config)
  'src/modules/auth/api/cancel-account-deletion.ts',
  'src/modules/auth/api/initiate-account-deletion.ts',
  'src/modules/export/api/export-user-data.ts',
  'src/modules/preferences/api/update-preferences.ts',
]);

/**
 * Files that intentionally skip both middlewares. `get-session.ts`
 * is the session endpoint itself — it calls `auth.api.getSession`
 * directly and can't depend on a middleware that loads sessions.
 */
const NO_MIDDLEWARE_FILES = new Set<string>([
  'src/modules/auth/api/get-session.ts',
]);

function findApiFiles(): string[] {
  return discoverApiDirs().flatMap((dir) =>
    readdirSync(dir)
      .filter((file) => file.endsWith('.ts') && !file.includes('.test.'))
      .map((file) => path.join(dir, file)),
  );
}

/**
 * Parses `.middleware([...])` usage. Handles single-line and
 * multi-line array literals, and multi-entry arrays (e.g.,
 * `[authMiddleware, rateLimitMiddleware]`). Returns the set of
 * middleware identifiers referenced in the call.
 */
function detectMiddlewares(source: string): Set<string> {
  const match = /\.middleware\(\s*\[([\s\S]*?)\]\s*\)/.exec(source);
  if (!match) return new Set();
  return new Set(
    match[1]
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean),
  );
}

describe('api middleware chain', () => {
  const files = findApiFiles();

  it('every api file uses a known middleware or is allowlisted', () => {
    const missing = files.filter((file) => {
      if (NO_MIDDLEWARE_FILES.has(file)) return false;
      const source = readFileSync(file, 'utf8');
      return detectMiddlewares(source).size === 0;
    });
    expect(missing).toEqual([]);
  });

  it('finance mutations use verifiedMutationMiddleware', () => {
    const gated = files.filter(
      (file) => !AUTH_ONLY_FILES.has(file) && !NO_MIDDLEWARE_FILES.has(file),
    );
    const wrong = gated.filter((file) => {
      const source = readFileSync(file, 'utf8');
      return !detectMiddlewares(source).has('verifiedMutationMiddleware');
    });
    expect(wrong).toEqual([]);
  });

  it('exempt self-service flows stay on authMiddleware', () => {
    const exempt = files.filter((file) => AUTH_ONLY_FILES.has(file));
    const wrong = exempt.filter((file) => {
      const source = readFileSync(file, 'utf8');
      const middlewares = detectMiddlewares(source);
      return (
        !middlewares.has('authMiddleware') ||
        middlewares.has('verifiedMutationMiddleware')
      );
    });
    expect(wrong).toEqual([]);
  });

  it('allowlists have no stale entries', () => {
    const actualFiles = new Set(files);
    const stale = [...AUTH_ONLY_FILES, ...NO_MIDDLEWARE_FILES].filter(
      (file) => !actualFiles.has(file),
    );
    expect(stale).toEqual([]);
  });
});
