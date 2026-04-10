import { and, eq } from 'drizzle-orm';
import { vi } from 'vitest';

import type { Db } from '@/db';

import { auditLogs } from '@/db/audit';
import { sendEmail } from '@/lib/email';
import { deletionRequests } from '@/modules/auth/db/deletion-requests';
import { cancelDeletionService } from '@/modules/auth/services/cancel-deletion';
import type { Db as TestDb } from '~test/factories/base';
import { insertUser } from '~test/factories/user.factory';
import { test } from '~test/integration-setup';

vi.mock('@/lib/email', () => ({ sendEmail: vi.fn() }));

const asDb = (db: TestDb) => db as unknown as Db;

test('cancelDeletionService — marks pending request as cancelled', async ({
  serviceDb,
}) => {
  const user = await insertUser(serviceDb);
  await serviceDb
    .insert(deletionRequests)
    .values({
      purgeAfter: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      userId: user.id,
    });

  await cancelDeletionService(asDb(serviceDb), user.id);

  const [row] = await serviceDb
    .select()
    .from(deletionRequests)
    .where(eq(deletionRequests.userId, user.id));
  expect(row.status).toBe('cancelled');
  expect(row.cancelledAt).not.toBeNull();
});

test('cancelDeletionService — writes audit log', async ({ serviceDb }) => {
  const user = await insertUser(serviceDb);
  await serviceDb
    .insert(deletionRequests)
    .values({
      purgeAfter: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      userId: user.id,
    });

  await cancelDeletionService(asDb(serviceDb), user.id);

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
  expect(logs[0].action).toBe('update');
});

test('cancelDeletionService — rejects when no pending request', async ({
  serviceDb,
}) => {
  const user = await insertUser(serviceDb);

  await expect(
    cancelDeletionService(asDb(serviceDb), user.id),
  ).rejects.toMatchObject({ status: 404 });
});

test('cancelDeletionService — commits cancellation even when email fails', async ({
  serviceDb,
}) => {
  const user = await insertUser(serviceDb);
  await serviceDb
    .insert(deletionRequests)
    .values({
      purgeAfter: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      userId: user.id,
    });
  vi.mocked(sendEmail).mockRejectedValueOnce(new Error('SMTP down'));

  await cancelDeletionService(asDb(serviceDb), user.id);

  const [row] = await serviceDb
    .select()
    .from(deletionRequests)
    .where(eq(deletionRequests.userId, user.id));
  expect(row.status).toBe('cancelled');
});

test('cancelDeletionService — rejects a request past its purge deadline', async ({
  serviceDb,
}) => {
  const user = await insertUser(serviceDb);
  await serviceDb
    .insert(deletionRequests)
    .values({ purgeAfter: new Date(Date.now() - 60_000), userId: user.id });

  await expect(
    cancelDeletionService(asDb(serviceDb), user.id),
  ).rejects.toMatchObject({ status: 404 });
});

test('cancelDeletionService — rejects an already-cancelled request', async ({
  serviceDb,
}) => {
  const user = await insertUser(serviceDb);
  await serviceDb
    .insert(deletionRequests)
    .values({
      cancelledAt: new Date(),
      purgeAfter: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      status: 'cancelled',
      userId: user.id,
    });

  await expect(
    cancelDeletionService(asDb(serviceDb), user.id),
  ).rejects.toMatchObject({ status: 404 });
});
