import { createServerFn } from '@tanstack/react-start';
import { eq } from 'drizzle-orm';

import { db } from '@/db';
import { log } from '@/lib/logging/evlog';
import { hashId } from '@/lib/logging/hash';
import { handleServerFnError } from '@/lib/server-fn/handle-error';
import { accounts } from '@/modules/auth/db/schema';
import { authMiddleware, requireUserId } from '@/modules/auth/middleware';

export const getLinkedAccounts = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const userId = requireUserId(context);

    try {
      const rows = await db
        .select({
          createdAt: accounts.createdAt,
          providerId: accounts.providerId,
        })
        .from(accounts)
        .where(eq(accounts.userId, userId));

      log.info({
        action: 'auth.linkedAccounts.list',
        outcome: { count: rows.length },
        user: { idHash: hashId(userId) },
      });

      return rows;
    } catch (error) {
      handleServerFnError(error, {
        action: 'auth.linkedAccounts.list',
        fix: 'Try reloading the page.',
        message: 'Failed to load linked accounts.',
        userId,
      });
    }
  });
