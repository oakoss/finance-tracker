import { eq } from 'drizzle-orm';
import { vi } from 'vitest';

import type { Db } from '@/db';

import { deletionRequests } from '@/modules/auth/db/deletion-requests';
import { users } from '@/modules/auth/db/schema';
import { runPurgeExpiredAccounts } from '@/modules/auth/services/run-purge';
import type { Db as TestDb } from '~test/factories/base';
import { insertUser } from '~test/factories/user.factory';
import { test } from '~test/integration-setup';

vi.mock('@/lib/email', () => ({ sendEmail: vi.fn() }));

const asDb = (db: TestDb) => db as unknown as Db;

test('runPurgeExpiredAccounts — purges only expired pending requests', async ({
  serviceDb,
}) => {
  const expired = await insertUser(serviceDb);
  const notYet = await insertUser(serviceDb);
  const alreadyCancelled = await insertUser(serviceDb);

  await serviceDb.insert(deletionRequests).values([
    { purgeAfter: new Date(Date.now() - 60_000), userId: expired.id },
    { purgeAfter: new Date(Date.now() + 60_000), userId: notYet.id },
    {
      cancelledAt: new Date(),
      purgeAfter: new Date(Date.now() - 60_000),
      status: 'cancelled',
      userId: alreadyCancelled.id,
    },
  ]);

  const result = await runPurgeExpiredAccounts(asDb(serviceDb));

  expect(result.purged).toBe(1);
  expect(result.failed).toBe(0);
  expect(result.total).toBe(1);

  // Expired user is gone
  const expiredRows = await serviceDb
    .select()
    .from(users)
    .where(eq(users.id, expired.id));
  expect(expiredRows).toHaveLength(0);

  // Not-yet-expired user remains
  const remainingRows = await serviceDb
    .select()
    .from(users)
    .where(eq(users.id, notYet.id));
  expect(remainingRows).toHaveLength(1);

  // Cancelled user remains
  const cancelledRows = await serviceDb
    .select()
    .from(users)
    .where(eq(users.id, alreadyCancelled.id));
  expect(cancelledRows).toHaveLength(1);
});

test('runPurgeExpiredAccounts — returns zero counts when nothing expired', async ({
  serviceDb,
}) => {
  const user = await insertUser(serviceDb);
  await serviceDb
    .insert(deletionRequests)
    .values({ purgeAfter: new Date(Date.now() + 60_000), userId: user.id });

  const result = await runPurgeExpiredAccounts(asDb(serviceDb));

  expect(result.total).toBe(0);
  expect(result.purged).toBe(0);
});
