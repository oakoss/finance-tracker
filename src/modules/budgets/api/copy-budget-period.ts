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
import { copyBudgetPeriodService } from '@/modules/budgets/services/copy-budget-period';
import { copyBudgetPeriodSchema } from '@/modules/budgets/validators';

export const copyBudgetPeriod = createServerFn({ method: 'POST' })
  .inputValidator(arkValidator(copyBudgetPeriodSchema))
  .middleware([verifiedMutationMiddleware])
  .handler(async ({ context, data }) => {
    const userId = requireUserId(context);

    try {
      const result = await copyBudgetPeriodService(db, userId, data);

      log.info({
        action: 'budgetPeriod.copy',
        outcome: { idHash: hashId(result.id) },
        user: { idHash: hashId(userId) },
      });

      return result;
    } catch (error) {
      handleServerFnError(error, {
        action: 'budgetPeriod.copy',
        fix: 'Try again. If the problem persists, contact support.',
        message: 'Failed to copy budget period.',
        userId,
      });
    }
  });
