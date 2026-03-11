import { createServerFn } from '@tanstack/react-start';

import { db } from '@/db';
import { arkValidator } from '@/lib/form/validation';
import { log } from '@/lib/logging/evlog';
import { hashId } from '@/lib/logging/hash';
import { handleServerFnError } from '@/lib/server-fn/handle-error';
import { authMiddleware, requireUserId } from '@/modules/auth/middleware';
import { createBudgetLineService } from '@/modules/budgets/services/create-budget-line';
import { createBudgetLineSchema } from '@/modules/budgets/validators';

export const createBudgetLine = createServerFn({ method: 'POST' })
  .inputValidator(arkValidator(createBudgetLineSchema))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const userId = requireUserId(context);

    try {
      const result = await createBudgetLineService(db, userId, data);

      log.info({
        action: 'budgetLine.create',
        outcome: { idHash: hashId(result.id) },
        user: { idHash: hashId(userId) },
      });

      return result;
    } catch (error) {
      handleServerFnError(error, {
        action: 'budgetLine.create',
        fix: 'Try again. If the problem persists, contact support.',
        message: 'Failed to create budget line.',
        userId,
      });
    }
  });
