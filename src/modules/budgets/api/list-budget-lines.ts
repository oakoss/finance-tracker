import { createServerFn } from '@tanstack/react-start';

import { db } from '@/db';
import { arkValidator } from '@/lib/form/validation';
import { log } from '@/lib/logging/evlog';
import { hashId } from '@/lib/logging/hash';
import { handleServerFnError } from '@/lib/server-fn/handle-error';
import { authMiddleware, requireUserId } from '@/modules/auth/middleware';
import { listBudgetLinesService } from '@/modules/budgets/services/list-budget-lines';
import { listBudgetLinesSchema } from '@/modules/budgets/validators';

export const listBudgetLines = createServerFn({ method: 'GET' })
  .inputValidator(arkValidator(listBudgetLinesSchema))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const userId = requireUserId(context);

    try {
      const result = await listBudgetLinesService(
        db,
        userId,
        data.budgetPeriodId,
      );

      log.info({
        action: 'budgetLine.list',
        outcome: { count: result.length },
        user: { idHash: hashId(userId) },
      });

      return result;
    } catch (error) {
      handleServerFnError(error, {
        action: 'budgetLine.list',
        fix: 'Refresh the page. If the problem persists, contact support.',
        message: 'Failed to list budget lines.',
        userId,
      });
    }
  });

export type BudgetLineListItem = Awaited<
  ReturnType<typeof listBudgetLines>
>[number];
