import { and, eq } from 'drizzle-orm';

import type { Db } from '@/db';
import type { DeleteBudgetPeriodInput } from '@/modules/budgets/validators';

import { insertAuditLog } from '@/lib/audit/insert-audit-log';
import { notDeleted } from '@/lib/audit/soft-delete';
import { ensureFound } from '@/lib/form/validation';
import { createError } from '@/lib/logging/evlog';
import { budgetLines, budgetPeriods } from '@/modules/budgets/db/schema';

export async function deleteBudgetPeriodService(
  database: Db,
  userId: string,
  data: DeleteBudgetPeriodInput,
) {
  return database.transaction(async (tx) => {
    const existing = await ensureFound(
      tx.query.budgetPeriods.findFirst({
        where: (t, { and: a, eq: e }) =>
          a(e(t.id, data.id), e(t.userId, userId), notDeleted(t.deletedAt)),
      }),
      'Budget period',
    );

    const now = new Date();

    const [deleted] = await tx
      .update(budgetPeriods)
      .set({ deletedAt: now, deletedById: userId })
      .where(
        and(
          eq(budgetPeriods.id, data.id),
          eq(budgetPeriods.userId, userId),
          notDeleted(budgetPeriods.deletedAt),
        ),
      )
      .returning();

    if (!deleted) {
      throw createError({
        fix: 'Refresh the page. This budget period may have already been deleted.',
        message: 'Budget period not found.',
        status: 409,
      });
    }

    // Cascade soft-delete to budget lines
    await tx
      .update(budgetLines)
      .set({ deletedAt: now, deletedById: userId })
      .where(
        and(
          eq(budgetLines.budgetPeriodId, data.id),
          notDeleted(budgetLines.deletedAt),
        ),
      );

    await insertAuditLog(tx, {
      action: 'delete',
      actorId: userId,
      beforeData: existing as unknown as Record<string, unknown>,
      entityId: data.id,
      tableName: 'budget_periods',
    });
  });
}
