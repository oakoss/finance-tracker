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
import { deleteBudgetPeriodService } from '@/modules/budgets/services/delete-budget-period';
import { deleteBudgetPeriodSchema } from '@/modules/budgets/validators';

export const deleteBudgetPeriod = createServerFn({ method: 'POST' })
  .inputValidator(arkValidator(deleteBudgetPeriodSchema))
  .middleware([verifiedMutationMiddleware])
  .handler(async ({ context, data }) => {
    const userId = requireUserId(context);

    try {
      await deleteBudgetPeriodService(db, userId, data);

      log.info({
        action: 'budgetPeriod.delete',
        outcome: { idHash: hashId(data.id) },
        user: { idHash: hashId(userId) },
      });

      return { success: true };
    } catch (error) {
      handleServerFnError(error, {
        action: 'budgetPeriod.delete',
        fix: 'Try again or contact support.',
        message: 'Failed to delete budget period.',
        userId,
      });
    }
  });
