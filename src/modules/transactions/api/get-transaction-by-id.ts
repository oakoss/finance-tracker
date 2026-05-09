import { createServerFn } from '@tanstack/react-start';
import { type } from 'arktype';

import { db } from '@/db';
import { log } from '@/lib/logging/evlog';
import { hashId } from '@/lib/logging/hash';
import { handleServerFnError } from '@/lib/server-fn/handle-error';
import { authMiddleware, requireUserId } from '@/modules/auth/middleware';
import { getTransactionByIdService } from '@/modules/transactions/services/get-transaction-by-id';

const inputSchema = type({ id: 'string.uuid' });

export const getTransactionById = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .inputValidator((raw) => {
    const result = inputSchema(raw);
    if (result instanceof type.errors) throw result;
    return result;
  })
  .handler(async ({ context, data }) => {
    const userId = requireUserId(context);

    try {
      const result = await getTransactionByIdService(db, userId, data.id);
      log.info({
        action: 'transaction.getById',
        outcome: { found: result !== null },
        user: { idHash: hashId(userId) },
      });
      return result;
    } catch (error) {
      handleServerFnError(error, {
        action: 'transaction.getById',
        fix: 'Refresh the page. If the problem persists, contact support.',
        message: 'Failed to load transaction.',
        userId,
      });
    }
  });
