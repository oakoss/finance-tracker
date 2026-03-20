import { createServerFn } from '@tanstack/react-start';

import { db } from '@/db';
import { arkValidator } from '@/lib/form/validation';
import { log } from '@/lib/logging/evlog';
import { hashId } from '@/lib/logging/hash';
import { handleServerFnError } from '@/lib/server-fn/handle-error';
import { authMiddleware, requireUserId } from '@/modules/auth/middleware';
import { getBudgetVsActualService } from '@/modules/budgets/services/get-budget-vs-actual';
import { getBudgetVsActualSchema } from '@/modules/budgets/validators';

export const getBudgetVsActual = createServerFn({ method: 'GET' })
  .inputValidator(arkValidator(getBudgetVsActualSchema))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const userId = requireUserId(context);

    try {
      const start = performance.now();
      const result = await getBudgetVsActualService(
        db,
        userId,
        data.budgetPeriodId,
      );

      log.info({
        action: 'budgetVsActual.get',
        outcome: {
          count: result.length,
          serviceMs: Math.round(performance.now() - start),
        },
        user: { idHash: hashId(userId) },
      });

      return result;
    } catch (error) {
      handleServerFnError(error, {
        action: 'budgetVsActual.get',
        fix: 'Refresh the page. If the problem persists, contact support.',
        message: 'Failed to load budget vs actual.',
        userId,
      });
    }
  });

export type BudgetVsActualItem = Awaited<
  ReturnType<typeof getBudgetVsActual>
>[number];
