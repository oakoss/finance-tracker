import { and, eq } from 'drizzle-orm';

import type { Db } from '@/db';
import type { UpdateBudgetPeriodInput } from '@/modules/budgets/validators';

import { insertAuditLog } from '@/lib/audit/insert-audit-log';
import { notDeleted } from '@/lib/audit/soft-delete';
import { ensureFound } from '@/lib/form/validation';
import { createError } from '@/lib/logging/evlog';
import { budgetPeriods } from '@/modules/budgets/db/schema';

export async function updateBudgetPeriodService(
  database: Db,
  userId: string,
  data: UpdateBudgetPeriodInput,
) {
  return database.transaction(async (tx) => {
    const { id, ...fields } = data;

    const existing = await ensureFound(
      tx.query.budgetPeriods.findFirst({
        where: (t, { and: a, eq: e }) =>
          a(e(t.id, id), e(t.userId, userId), notDeleted(t.deletedAt)),
      }),
      'Budget period',
    );

    const [updated] = await tx
      .update(budgetPeriods)
      .set({
        ...fields,
        updatedById: userId,
      })
      .where(
        and(
          eq(budgetPeriods.id, id),
          eq(budgetPeriods.userId, userId),
          notDeleted(budgetPeriods.deletedAt),
        ),
      )
      .returning();

    if (!updated) {
      throw createError({
        fix: 'Refresh the page. This budget period may have been deleted.',
        message: 'Budget period not found.',
        status: 409,
      });
    }

    await insertAuditLog(tx, {
      action: 'update',
      actorId: userId,
      afterData: updated as unknown as Record<string, unknown>,
      beforeData: existing as unknown as Record<string, unknown>,
      entityId: id,
      tableName: 'budget_periods',
    });

    return updated;
  });
}
