import type { Db } from '@/db';
import type { CreateBudgetPeriodInput } from '@/modules/budgets/validators';

import { insertAuditLog } from '@/lib/audit/insert-audit-log';
import { createError } from '@/lib/logging/evlog';
import { budgetPeriods } from '@/modules/budgets/db/schema';

export async function createBudgetPeriodService(
  database: Db,
  userId: string,
  data: CreateBudgetPeriodInput,
) {
  return database.transaction(async (tx) => {
    const [period] = await tx
      .insert(budgetPeriods)
      .values({
        createdById: userId,
        month: data.month,
        notes: data.notes ?? null,
        userId,
        year: data.year,
      })
      .returning();

    if (!period) {
      throw createError({
        fix: 'Try again. If the problem persists, contact support.',
        message: 'Failed to create budget period.',
        status: 500,
      });
    }

    await insertAuditLog(tx, {
      action: 'create',
      actorId: userId,
      afterData: period as unknown as Record<string, unknown>,
      entityId: period.id,
      tableName: 'budget_periods',
    });

    return period;
  });
}
