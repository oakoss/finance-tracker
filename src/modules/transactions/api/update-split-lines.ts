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
import { updateSplitLinesService } from '@/modules/transactions/services/update-split-lines';
import { updateSplitLinesSchema } from '@/modules/transactions/validators';

export const updateSplitLines = createServerFn({ method: 'POST' })
  .inputValidator(arkValidator(updateSplitLinesSchema))
  .middleware([verifiedMutationMiddleware])
  .handler(async ({ context, data }) => {
    const userId = requireUserId(context);

    try {
      const result = await updateSplitLinesService(db, userId, data);

      log.info({
        action: 'transaction.updateSplitLines',
        outcome: { idHash: hashId(result.id), lineCount: data.lines.length },
        user: { idHash: hashId(userId) },
      });

      return result;
    } catch (error) {
      handleServerFnError(error, {
        action: 'transaction.updateSplitLines',
        fix: 'Try again. If the problem persists, contact support.',
        message: 'Failed to update split lines.',
        userId,
      });
    }
  });
