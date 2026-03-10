import { createServerFn } from '@tanstack/react-start';

import { db } from '@/db';
import { log } from '@/lib/logging/evlog';
import { hashId } from '@/lib/logging/hash';
import { handleServerFnError } from '@/lib/server-fn/handle-error';
import { authMiddleware, requireUserId } from '@/modules/auth/middleware';
import { listBudgetPeriodsService } from '@/modules/budgets/services/list-budget-periods';

export const listBudgetPeriods = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const userId = requireUserId(context);

    try {
      const result = await listBudgetPeriodsService(db, userId);

      log.info({
        action: 'budgetPeriod.list',
        outcome: { count: result.length },
        user: { idHash: hashId(userId) },
      });

      return result;
    } catch (error) {
      handleServerFnError(error, {
        action: 'budgetPeriod.list',
        fix: 'Refresh the page. If the problem persists, contact support.',
        message: 'Failed to list budget periods.',
        userId,
      });
    }
  });

export type BudgetPeriodListItem = Awaited<
  ReturnType<typeof listBudgetPeriods>
>[number];
