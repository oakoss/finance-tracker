import { createServerFn } from '@tanstack/react-start';

import { db } from '@/db';
import { log } from '@/lib/logging/evlog';
import { hashId } from '@/lib/logging/hash';
import { handleServerFnError } from '@/lib/server-fn/handle-error';
import { authMiddleware, requireUserId } from '@/modules/auth/middleware';
import { listTransactionsService } from '@/modules/transactions/services/list-transactions';

export const listTransactions = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const userId = requireUserId(context);

    try {
      const start = performance.now();
      const result = await listTransactionsService(db, userId);

      log.info({
        action: 'transaction.list',
        outcome: {
          count: result.length,
          serviceMs: Math.round(performance.now() - start),
        },
        user: { idHash: hashId(userId) },
      });

      return result;
    } catch (error) {
      handleServerFnError(error, {
        action: 'transaction.list',
        fix: 'Refresh the page. If the problem persists, contact support.',
        message: 'Failed to list transactions.',
        userId,
      });
    }
  });

export type TransactionListItem = Awaited<
  ReturnType<typeof listTransactions>
>[number];
