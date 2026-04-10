import { and, eq, lte } from 'drizzle-orm';

import type { Db } from '@/db';

import { log } from '@/lib/logging/evlog';
import { deletionRequests } from '@/modules/auth/db/deletion-requests';
import { purgeUser } from '@/modules/auth/services/purge-user';

export async function runPurgeExpiredAccounts(database: Db) {
  const expired = await database
    .select({ userId: deletionRequests.userId })
    .from(deletionRequests)
    .where(
      and(
        eq(deletionRequests.status, 'pending'),
        lte(deletionRequests.purgeAfter, new Date()),
      ),
    );

  if (expired.length === 0) {
    log.info({ action: 'auth.account.purge.task', outcome: { count: 0 } });
    return { failed: 0, purged: 0, total: 0 };
  }

  let purged = 0;
  let failed = 0;

  for (const { userId } of expired) {
    try {
      await purgeUser(database, userId, userId);
      purged++;
    } catch (error) {
      failed++;
      log.error({ action: 'auth.account.purge.task.failed', error });
    }
  }

  log.info({
    action: 'auth.account.purge.task',
    outcome: { failed, purged, total: expired.length },
  });

  return { failed, purged, total: expired.length };
}
