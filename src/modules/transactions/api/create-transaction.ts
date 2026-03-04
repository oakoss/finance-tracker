import { createServerFn } from '@tanstack/react-start';

import { db } from '@/db';
import { arkValidator } from '@/lib/form/validation';
import { log } from '@/lib/logging/evlog';
import { hashId } from '@/lib/logging/hash';
import { handleServerFnError } from '@/lib/server-fn/handle-error';
import { authMiddleware, requireUserId } from '@/modules/auth/middleware';
import { createTransactionService } from '@/modules/transactions/services/create-transaction';
import { createTransactionSchema } from '@/modules/transactions/types';

export const createTransaction = createServerFn({ method: 'POST' })
  .inputValidator(arkValidator(createTransactionSchema))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const userId = requireUserId(context);

    try {
      const result = await createTransactionService(db, userId, data);

      log.info({
        action: 'transaction.create',
        outcome: { idHash: hashId(result.id) },
        user: { idHash: hashId(userId) },
      });

      return result;
    } catch (error) {
      handleServerFnError(error, {
        action: 'transaction.create',
        fix: 'Try again. If the problem persists, contact support.',
        message: 'Failed to create transaction.',
        userId,
      });
    }
  });
