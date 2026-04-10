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
import { updateBudgetLineService } from '@/modules/budgets/services/update-budget-line';
import { updateBudgetLineSchema } from '@/modules/budgets/validators';

export const updateBudgetLine = createServerFn({ method: 'POST' })
  .inputValidator(arkValidator(updateBudgetLineSchema))
  .middleware([verifiedMutationMiddleware])
  .handler(async ({ context, data }) => {
    const userId = requireUserId(context);

    try {
      const result = await updateBudgetLineService(db, userId, data);

      log.info({
        action: 'budgetLine.update',
        outcome: { idHash: hashId(result.id) },
        user: { idHash: hashId(userId) },
      });

      return result;
    } catch (error) {
      handleServerFnError(error, {
        action: 'budgetLine.update',
        fix: 'Try again. If the problem persists, contact support.',
        message: 'Failed to update budget line.',
        userId,
      });
    }
  });
