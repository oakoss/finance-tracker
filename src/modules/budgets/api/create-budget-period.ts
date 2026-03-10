import { createServerFn } from '@tanstack/react-start';

import { db } from '@/db';
import { arkValidator } from '@/lib/form/validation';
import { log } from '@/lib/logging/evlog';
import { hashId } from '@/lib/logging/hash';
import { handleServerFnError } from '@/lib/server-fn/handle-error';
import { authMiddleware, requireUserId } from '@/modules/auth/middleware';
import { createBudgetPeriodService } from '@/modules/budgets/services/create-budget-period';
import { createBudgetPeriodSchema } from '@/modules/budgets/validators';

export const createBudgetPeriod = createServerFn({ method: 'POST' })
  .inputValidator(arkValidator(createBudgetPeriodSchema))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const userId = requireUserId(context);

    try {
      const result = await createBudgetPeriodService(db, userId, data);

      log.info({
        action: 'budgetPeriod.create',
        outcome: { idHash: hashId(result.id) },
        user: { idHash: hashId(userId) },
      });

      return result;
    } catch (error) {
      handleServerFnError(error, {
        action: 'budgetPeriod.create',
        fix: 'Try again. If the problem persists, contact support.',
        message: 'Failed to create budget period.',
        userId,
      });
    }
  });
