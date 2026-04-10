import { createServerFn } from '@tanstack/react-start';

import { db } from '@/db';
import { arkValidator } from '@/lib/form/validation';
import { log } from '@/lib/logging/evlog';
import { hashId } from '@/lib/logging/hash';
import { handleServerFnError } from '@/lib/server-fn/handle-error';
import {
  requireUserId,
  verifiedMutationMiddleware,
} from '@/modules/auth/middleware';
import { updateTransactionService } from '@/modules/transactions/services/update-transaction';
import { updateTransactionSchema } from '@/modules/transactions/validators';

export const updateTransaction = createServerFn({ method: 'POST' })
  .inputValidator(arkValidator(updateTransactionSchema))
  .middleware([verifiedMutationMiddleware])
  .handler(async ({ context, data }) => {
    const userId = requireUserId(context);

    try {
      const result = await updateTransactionService(db, userId, data);

      log.info({
        action: 'transaction.update',
        outcome: { idHash: hashId(result.id) },
        user: { idHash: hashId(userId) },
      });

      return result;
    } catch (error) {
      handleServerFnError(error, {
        action: 'transaction.update',
        fix: 'Try again. If the problem persists, contact support.',
        message: 'Failed to update transaction.',
        userId,
      });
    }
  });
