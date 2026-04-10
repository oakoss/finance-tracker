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
import { deleteTransactionService } from '@/modules/transactions/services/delete-transaction';
import { deleteTransactionSchema } from '@/modules/transactions/validators';

export const deleteTransaction = createServerFn({ method: 'POST' })
  .inputValidator(arkValidator(deleteTransactionSchema))
  .middleware([verifiedMutationMiddleware])
  .handler(async ({ context, data }) => {
    const userId = requireUserId(context);

    try {
      await deleteTransactionService(db, userId, data);

      log.info({
        action: 'transaction.delete',
        outcome: { idHash: hashId(data.id) },
        user: { idHash: hashId(userId) },
      });

      return { success: true };
    } catch (error) {
      handleServerFnError(error, {
        action: 'transaction.delete',
        fix: 'Try again or contact support.',
        message: 'Failed to delete transaction.',
        userId,
      });
    }
  });
