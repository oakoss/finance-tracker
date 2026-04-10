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
import { unsplitTransactionService } from '@/modules/transactions/services/unsplit-transaction';
import { unsplitTransactionSchema } from '@/modules/transactions/validators';

export const unsplitTransaction = createServerFn({ method: 'POST' })
  .inputValidator(arkValidator(unsplitTransactionSchema))
  .middleware([verifiedMutationMiddleware])
  .handler(async ({ context, data }) => {
    const userId = requireUserId(context);

    try {
      const result = await unsplitTransactionService(db, userId, data);

      log.info({
        action: 'transaction.unsplit',
        outcome: { idHash: hashId(result.id) },
        user: { idHash: hashId(userId) },
      });

      return result;
    } catch (error) {
      handleServerFnError(error, {
        action: 'transaction.unsplit',
        fix: 'Try again. If the problem persists, contact support.',
        message: 'Failed to unsplit transaction.',
        userId,
      });
    }
  });
