import { createServerFn } from '@tanstack/react-start';

import { db } from '@/db';
import { arkValidator } from '@/lib/form/validation';
import { log } from '@/lib/logging/evlog';
import { hashId } from '@/lib/logging/hash';
import { handleServerFnError } from '@/lib/server-fn/handle-error';
import { authMiddleware, requireUserId } from '@/modules/auth/middleware';
import { deleteBudgetLineService } from '@/modules/budgets/services/delete-budget-line';
import { deleteBudgetLineSchema } from '@/modules/budgets/validators';

export const deleteBudgetLine = createServerFn({ method: 'POST' })
  .inputValidator(arkValidator(deleteBudgetLineSchema))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const userId = requireUserId(context);

    try {
      await deleteBudgetLineService(db, userId, data);

      log.info({
        action: 'budgetLine.delete',
        outcome: { idHash: hashId(data.id) },
        user: { idHash: hashId(userId) },
      });

      return { success: true };
    } catch (error) {
      handleServerFnError(error, {
        action: 'budgetLine.delete',
        fix: 'Try again or contact support.',
        message: 'Failed to delete budget line.',
        userId,
      });
    }
  });
