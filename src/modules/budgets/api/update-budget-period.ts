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
import { updateBudgetPeriodService } from '@/modules/budgets/services/update-budget-period';
import { updateBudgetPeriodSchema } from '@/modules/budgets/validators';

export const updateBudgetPeriod = createServerFn({ method: 'POST' })
  .inputValidator(arkValidator(updateBudgetPeriodSchema))
  .middleware([verifiedMutationMiddleware])
  .handler(async ({ context, data }) => {
    const userId = requireUserId(context);

    try {
      const result = await updateBudgetPeriodService(db, userId, data);

      log.info({
        action: 'budgetPeriod.update',
        outcome: { idHash: hashId(result.id) },
        user: { idHash: hashId(userId) },
      });

      return result;
    } catch (error) {
      handleServerFnError(error, {
        action: 'budgetPeriod.update',
        fix: 'Try again. If the problem persists, contact support.',
        message: 'Failed to update budget period.',
        userId,
      });
    }
  });
