import { createServerFn } from '@tanstack/react-start';

import { db } from '@/db';
import { arkValidator } from '@/lib/form/validation';
import { log } from '@/lib/logging/evlog';
import { hashId } from '@/lib/logging/hash';
import { handleServerFnError } from '@/lib/server-fn/handle-error';
import { authMiddleware, requireUserId } from '@/modules/auth/middleware';
import { splitTransactionService } from '@/modules/transactions/services/split-transaction';
import { splitTransactionSchema } from '@/modules/transactions/validators';

export const splitTransaction = createServerFn({ method: 'POST' })
  .inputValidator(arkValidator(splitTransactionSchema))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const userId = requireUserId(context);

    try {
      const result = await splitTransactionService(db, userId, data);

      log.info({
        action: 'transaction.split',
        outcome: { idHash: hashId(result.id), lineCount: data.lines.length },
        user: { idHash: hashId(userId) },
      });

      return result;
    } catch (error) {
      handleServerFnError(error, {
        action: 'transaction.split',
        fix: 'Try again. If the problem persists, contact support.',
        message: 'Failed to split transaction.',
        userId,
      });
    }
  });
