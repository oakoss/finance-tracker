import { eq } from 'drizzle-orm';
import { vi } from 'vitest';

import type { Db } from '@/db';

import { deletionRequests } from '@/modules/auth/db/deletion-requests';
import { users } from '@/modules/auth/db/schema';
import { purgeUser } from '@/modules/auth/services/purge-user';
import { insertAccountWithUser } from '~test/factories/account-with-user.factory';
import type { Db as TestDb } from '~test/factories/base';
import { insertCategory } from '~test/factories/category.factory';
import { insertUser } from '~test/factories/user.factory';
import { test } from '~test/integration-setup';

vi.mock('@/lib/email', () => ({ sendEmail: vi.fn() }));

const asDb = (db: TestDb) => db as unknown as Db;

test('purgeUser — hard-deletes user and cascades finance data', async ({
  serviceDb,
}) => {
  const { account, user } = await insertAccountWithUser(serviceDb);
  await insertCategory(serviceDb, { userId: user.id });
  await serviceDb
    .insert(deletionRequests)
    .values({ purgeAfter: new Date(Date.now() - 1000), userId: user.id });

  await purgeUser(asDb(serviceDb), user.id, null);

  const userRows = await serviceDb
    .select()
    .from(users)
    .where(eq(users.id, user.id));
  expect(userRows).toHaveLength(0);

  // Cascaded: account should be gone too
  const { ledgerAccounts } = await import('@/modules/accounts/db/schema');
  const accountRows = await serviceDb
    .select()
    .from(ledgerAccounts)
    .where(eq(ledgerAccounts.id, account.id));
  expect(accountRows).toHaveLength(0);
});

test('purgeUser — aborts when deletion request is not pending', async ({
  serviceDb,
}) => {
  const user = await insertUser(serviceDb);
  await serviceDb
    .insert(deletionRequests)
    .values({
      cancelledAt: new Date(),
      purgeAfter: new Date(Date.now() - 1000),
      status: 'cancelled',
      userId: user.id,
    });

  await purgeUser(asDb(serviceDb), user.id, null);

  const userRows = await serviceDb
    .select()
    .from(users)
    .where(eq(users.id, user.id));
  expect(userRows).toHaveLength(1);
});

test('purgeUser — aborts when no deletion request exists', async ({
  serviceDb,
}) => {
  const user = await insertUser(serviceDb);

  await purgeUser(asDb(serviceDb), user.id, null);

  const userRows = await serviceDb
    .select()
    .from(users)
    .where(eq(users.id, user.id));
  expect(userRows).toHaveLength(1);
});

test('purgeUser — still deletes user when PostHog is not configured', async ({
  serviceDb,
}) => {
  // Test env has no POSTHOG_* vars set, so deletePostHogPerson hits the
  // "not configured" branch. Verifies the user is still hard-deleted
  // when PostHog deletion is skipped.
  const user = await insertUser(serviceDb);
  await serviceDb
    .insert(deletionRequests)
    .values({ purgeAfter: new Date(Date.now() - 1000), userId: user.id });

  await purgeUser(asDb(serviceDb), user.id, user.id);

  const userRows = await serviceDb
    .select()
    .from(users)
    .where(eq(users.id, user.id));
  expect(userRows).toHaveLength(0);
});
