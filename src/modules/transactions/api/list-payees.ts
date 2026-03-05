import { createServerFn } from '@tanstack/react-start';

import { db } from '@/db';
import { log } from '@/lib/logging/evlog';
import { hashId } from '@/lib/logging/hash';
import { handleServerFnError } from '@/lib/server-fn/handle-error';
import { authMiddleware, requireUserId } from '@/modules/auth/middleware';
import { listPayeesService } from '@/modules/transactions/services/list-payees';

export const listPayees = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const userId = requireUserId(context);

    try {
      const rows = await listPayeesService(db, userId);

      log.info({
        action: 'payee.list',
        outcome: { count: rows.length },
        user: { idHash: hashId(userId) },
      });

      return rows;
    } catch (error) {
      handleServerFnError(error, {
        action: 'payee.list',
        fix: 'Refresh the page. If the problem persists, contact support.',
        message: 'Failed to list payees.',
        userId,
      });
    }
  });

export type PayeeListItem = Awaited<ReturnType<typeof listPayees>>[number];
