import { and, eq } from 'drizzle-orm';
import { vi } from 'vitest';

import type { Db } from '@/db';

import { auditLogs } from '@/db/audit';
import { sendEmail } from '@/lib/email';
import { deletionRequests } from '@/modules/auth/db/deletion-requests';
import { initiateDeletionService } from '@/modules/auth/services/initiate-deletion';
import type { Db as TestDb } from '~test/factories/base';
import { insertUser } from '~test/factories/user.factory';
import { test } from '~test/integration-setup';

vi.mock('@/lib/email', () => ({ sendEmail: vi.fn() }));

const asDb = (db: TestDb) => db as unknown as Db;

test('initiateDeletionService — creates pending deletion request', async ({
  serviceDb,
}) => {
  const user = await insertUser(serviceDb);
  const before = Date.now();

  const result = await initiateDeletionService(asDb(serviceDb), user.id);

  const expected = before + 7 * 24 * 60 * 60 * 1000;
  expect(result.purgeAfter.getTime()).toBeGreaterThanOrEqual(expected);
  expect(result.purgeAfter.getTime()).toBeLessThan(expected + 5000);

  const [row] = await serviceDb
    .select()
    .from(deletionRequests)
    .where(eq(deletionRequests.userId, user.id));
  expect(row.status).toBe('pending');
  expect(row.cancelledAt).toBeNull();
});

test('initiateDeletionService — repeat call is idempotent on pending', async ({
  serviceDb,
}) => {
  const user = await insertUser(serviceDb);

  const first = await initiateDeletionService(asDb(serviceDb), user.id);
  await new Promise((resolve) => {
    setTimeout(resolve, 10);
  });
  const second = await initiateDeletionService(asDb(serviceDb), user.id);

  // Grace period is NOT extended on repeat
  expect(second.purgeAfter.getTime()).toBe(first.purgeAfter.getTime());
});

test('initiateDeletionService — reactivates a cancelled request', async ({
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

  const result = await initiateDeletionService(asDb(serviceDb), user.id);

  const [row] = await serviceDb
    .select()
    .from(deletionRequests)
    .where(eq(deletionRequests.userId, user.id));
  expect(row.status).toBe('pending');
  expect(row.cancelledAt).toBeNull();
  expect(row.purgeAfter.getTime()).toBe(result.purgeAfter.getTime());
});

test('initiateDeletionService — writes audit log', async ({ serviceDb }) => {
  const user = await insertUser(serviceDb);

  await initiateDeletionService(asDb(serviceDb), user.id);

  const logs = await serviceDb
    .select()
    .from(auditLogs)
    .where(
      and(
        eq(auditLogs.actorId, user.id),
        eq(auditLogs.tableName, 'deletion_requests'),
      ),
    );
  expect(logs).toHaveLength(1);
  expect(logs[0].action).toBe('create');
});

test('initiateDeletionService — rejects unknown user', async ({
  serviceDb,
}) => {
  await expect(
    initiateDeletionService(
      asDb(serviceDb),
      '00000000-0000-0000-0000-000000000000',
    ),
  ).rejects.toMatchObject({ status: 404 });
});

test('initiateDeletionService — commits request even when email fails', async ({
  serviceDb,
}) => {
  const user = await insertUser(serviceDb);
  vi.mocked(sendEmail).mockRejectedValueOnce(new Error('SMTP down'));

  const result = await initiateDeletionService(asDb(serviceDb), user.id);

  expect(result.purgeAfter).toBeInstanceOf(Date);
  const [row] = await serviceDb
    .select()
    .from(deletionRequests)
    .where(eq(deletionRequests.userId, user.id));
  expect(row.status).toBe('pending');
});
