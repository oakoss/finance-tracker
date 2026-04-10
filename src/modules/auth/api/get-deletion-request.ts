import { createServerFn } from '@tanstack/react-start';
import { and, eq, gt } from 'drizzle-orm';

import { db } from '@/db';
import { handleServerFnError } from '@/lib/server-fn/handle-error';
import { deletionRequests } from '@/modules/auth/db/deletion-requests';
import { authMiddleware, requireUserId } from '@/modules/auth/middleware';

export type DeletionRequest = { purgeAfter: string } | null;

export const getDeletionRequest = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const userId = requireUserId(context);

    try {
      const [request] = await db
        .select({ purgeAfter: deletionRequests.purgeAfter })
        .from(deletionRequests)
        .where(
          and(
            eq(deletionRequests.userId, userId),
            eq(deletionRequests.status, 'pending'),
            gt(deletionRequests.purgeAfter, new Date()),
          ),
        );

      if (!request) return null;

      return { purgeAfter: request.purgeAfter.toISOString() };
    } catch (error) {
      handleServerFnError(error, {
        action: 'auth.deletion.get',
        fix: 'Try reloading the page.',
        message: 'Failed to load deletion request.',
        userId,
      });
    }
  });
