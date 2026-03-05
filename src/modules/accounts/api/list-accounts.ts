import { createServerFn } from '@tanstack/react-start';

import { db } from '@/db';
import { log } from '@/lib/logging/evlog';
import { hashId } from '@/lib/logging/hash';
import { handleServerFnError } from '@/lib/server-fn/handle-error';
import { listAccountsService } from '@/modules/accounts/services/list-accounts';
import { authMiddleware, requireUserId } from '@/modules/auth/middleware';

export const listAccounts = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const userId = requireUserId(context);

    try {
      const result = await listAccountsService(db, userId);

      log.info({
        action: 'account.list',
        outcome: { count: result.length },
        user: { idHash: hashId(userId) },
      });

      return result;
    } catch (error) {
      handleServerFnError(error, {
        action: 'account.list',
        fix: 'Refresh the page. If the problem persists, contact support.',
        message: 'Failed to list accounts.',
        userId,
      });
    }
  });

export type AccountListItem = Awaited<ReturnType<typeof listAccounts>>[number];
