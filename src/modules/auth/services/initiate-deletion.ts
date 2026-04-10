import { and, eq } from 'drizzle-orm';

import type { Db } from '@/db';

import { insertAuditLog } from '@/lib/audit/insert-audit-log';
import { createError, log } from '@/lib/logging/evlog';
import { hashId } from '@/lib/logging/hash';
import { deletionRequests } from '@/modules/auth/db/deletion-requests';
import { users } from '@/modules/auth/db/schema';
import { sendDeletionScheduledEmail } from '@/modules/auth/emails/email-service';

const GRACE_PERIOD_MS = 7 * 24 * 60 * 60 * 1000;

export async function initiateDeletionService(database: Db, userId: string) {
  const [user] = await database
    .select({ email: users.email, name: users.name })
    .from(users)
    .where(eq(users.id, userId));

  if (!user) {
    throw createError({
      fix: 'Sign out and sign back in, then try again.',
      message: 'User not found.',
      status: 404,
      why: 'Your user record could not be located.',
    });
  }

  const purgeAfter = new Date(Date.now() + GRACE_PERIOD_MS);

  const { request, wasExisting } = await database.transaction(async (tx) => {
    // Repeat-click guard: if a pending request already exists, return it
    // unchanged so the grace period isn't extended.
    const [existing] = await tx
      .select()
      .from(deletionRequests)
      .where(
        and(
          eq(deletionRequests.userId, userId),
          eq(deletionRequests.status, 'pending'),
        ),
      )
      .for('update');

    if (existing) {
      return { request: existing, wasExisting: true };
    }

    const [row] = await tx
      .insert(deletionRequests)
      .values({ purgeAfter, userId })
      .onConflictDoUpdate({
        set: {
          cancelledAt: null,
          initiatedAt: new Date(),
          purgeAfter,
          status: 'pending',
        },
        target: deletionRequests.userId,
      })
      .returning();

    await insertAuditLog(tx, {
      action: 'create',
      actorId: userId,
      afterData: { purgeAfter: purgeAfter.toISOString(), status: 'pending' },
      entityId: row.id,
      tableName: 'deletion_requests',
    });

    return { request: row, wasExisting: false };
  });

  // Skip email resend on idempotent re-initiation — user already got one.
  if (!wasExisting) {
    // best-effort — DB state is already committed
    try {
      await sendDeletionScheduledEmail({
        purgeAfter: request.purgeAfter,
        user: { email: user.email, id: userId, name: user.name },
      });
    } catch (error) {
      log.error({
        action: 'auth.deletion.email.failed',
        error,
        user: { idHash: hashId(userId) },
      });
    }
  }

  return { purgeAfter: request.purgeAfter };
}
