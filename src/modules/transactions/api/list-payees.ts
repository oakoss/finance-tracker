import { createServerFn } from '@tanstack/react-start';
import { and, asc, eq } from 'drizzle-orm';

import { db } from '@/db';
import { notDeleted } from '@/lib/audit/soft-delete';
import { createError, log } from '@/lib/logging/evlog';
import { hashId } from '@/lib/logging/hash';
import { isExpectedError, toError } from '@/lib/validation';
import { authMiddleware, requireUserId } from '@/modules/auth/middleware';
import { payees } from '@/modules/transactions/db/schema';

export const listPayees = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const userId = requireUserId(context);

    try {
      const rows = await db
        .select({
          id: payees.id,
          name: payees.name,
        })
        .from(payees)
        .where(and(eq(payees.userId, userId), notDeleted(payees.deletedAt)))
        .orderBy(asc(payees.name));

      log.info({
        action: 'payee.list',
        outcome: { count: rows.length },
        user: { idHash: hashId(userId) },
      });

      return rows;
    } catch (error) {
      if (isExpectedError(error)) throw error;
      log.error({
        action: 'payee.list',
        error: toError(error).message,
        outcome: { success: false },
        user: { idHash: hashId(userId) },
      });
      throw createError({
        cause: toError(error),
        fix: 'Refresh the page. If the problem persists, contact support.',
        message: 'Failed to list payees.',
        status: 500,
      });
    }
  });

export type PayeeListItem = Awaited<ReturnType<typeof listPayees>>[number];
