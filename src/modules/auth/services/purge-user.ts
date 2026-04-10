import { and, eq } from 'drizzle-orm';
import { ENV } from 'varlock/env';

import type { Db } from '@/db';

import { log } from '@/lib/logging/evlog';
import { hashId } from '@/lib/logging/hash';
import { deletionRequests } from '@/modules/auth/db/deletion-requests';
import { users } from '@/modules/auth/db/schema';
import { sendDeletionCompleteEmail } from '@/modules/auth/emails/email-service';

export async function purgeUser(
  database: Db,
  userId: string,
  posthogDistinctId: string | null,
) {
  const user = await database.transaction(async (tx) => {
    // Race guard: SELECT FOR UPDATE locks the row so a concurrent cancel
    // either blocks until we commit, or waits and sees no pending request.
    const [request] = await tx
      .select({ status: deletionRequests.status })
      .from(deletionRequests)
      .where(
        and(
          eq(deletionRequests.userId, userId),
          eq(deletionRequests.status, 'pending'),
        ),
      )
      .for('update');

    if (!request) {
      log.info({
        action: 'auth.account.purge.aborted',
        outcome: { reason: 'not_pending' },
        user: { idHash: hashId(userId) },
      });
      return null;
    }

    const [row] = await tx
      .select({ email: users.email, name: users.name })
      .from(users)
      .where(eq(users.id, userId));

    if (!row) {
      log.warn({
        action: 'auth.account.purge.skipped',
        outcome: { reason: 'user_not_found' },
        user: { idHash: hashId(userId) },
      });
      return null;
    }

    // Hard-delete user row — cascades to all finance data
    await tx.delete(users).where(eq(users.id, userId));

    return row;
  });

  if (!user) return;

  log.info({ action: 'auth.account.purged', user: { idHash: hashId(userId) } });

  // best-effort — user row is already deleted
  if (posthogDistinctId) {
    try {
      await deletePostHogPerson(posthogDistinctId);
    } catch (error) {
      log.error({
        action: 'auth.account.purge.posthog',
        error,
        user: { idHash: hashId(userId) },
      });
    }
  }

  try {
    await sendDeletionCompleteEmail({
      user: { email: user.email, name: user.name },
    });
  } catch (error) {
    log.error({
      action: 'auth.account.purge.email',
      error,
      user: { idHash: hashId(userId) },
    });
  }
}

async function deletePostHogPerson(distinctId: string) {
  const host = ENV.POSTHOG_HOST;
  const projectId = ENV.POSTHOG_PROJECT_ID;
  const apiKey = ENV.POSTHOG_PERSONAL_API_KEY;

  if (!host || !projectId || !apiKey) {
    log.warn({
      action: 'auth.account.purge.posthog.skipped',
      outcome: { reason: 'posthog_not_configured' },
    });
    return;
  }

  const response = await fetch(
    `${host}/api/projects/${projectId}/persons/bulk_delete/`,
    {
      body: JSON.stringify({ delete_events: true, distinct_ids: [distinctId] }),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      method: 'POST',
    },
  );

  if (!response.ok) {
    throw new Error(
      `PostHog bulk_delete failed: ${response.status} ${response.statusText}`,
    );
  }
}
