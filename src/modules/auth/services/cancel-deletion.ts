import { and, eq, gt } from 'drizzle-orm';

import type { Db } from '@/db';

import { insertAuditLog } from '@/lib/audit/insert-audit-log';
import { createError, log } from '@/lib/logging/evlog';
import { hashId } from '@/lib/logging/hash';
import { deletionRequests } from '@/modules/auth/db/deletion-requests';
import { users } from '@/modules/auth/db/schema';
import { sendDeletionCancelledEmail } from '@/modules/auth/emails/email-service';

export async function cancelDeletionService(database: Db, userId: string) {
  const request = await database.transaction(async (tx) => {
    // Race guard: SELECT FOR UPDATE serializes against the purge task.
    const [row] = await tx
      .select({ id: deletionRequests.id })
      .from(deletionRequests)
      .where(
        and(
          eq(deletionRequests.userId, userId),
          eq(deletionRequests.status, 'pending'),
          gt(deletionRequests.purgeAfter, new Date()),
        ),
      )
      .for('update');

    if (!row) return null;

    await tx
      .update(deletionRequests)
      .set({ cancelledAt: new Date(), status: 'cancelled' })
      .where(eq(deletionRequests.id, row.id));

    await insertAuditLog(tx, {
      action: 'update',
      actorId: userId,
      afterData: { status: 'cancelled' },
      beforeData: { status: 'pending' },
      entityId: row.id,
      tableName: 'deletion_requests',
    });

    return row;
  });

  if (!request) {
    throw createError({
      fix: 'Reload the page. The deletion may have already been cancelled or completed.',
      message: 'No pending deletion request found.',
      status: 404,
      why: 'There is no active deletion request for your account.',
    });
  }

  const [user] = await database
    .select({ email: users.email, name: users.name })
    .from(users)
    .where(eq(users.id, userId));

  // best-effort — cancellation is already committed
  if (user) {
    try {
      await sendDeletionCancelledEmail({
        user: { email: user.email, id: userId, name: user.name },
      });
    } catch (error) {
      log.error({
        action: 'auth.deletion.cancel.email.failed',
        error,
        user: { idHash: hashId(userId) },
      });
    }
  }
}
