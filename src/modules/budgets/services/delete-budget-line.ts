import { and, eq } from 'drizzle-orm';

import type { Db } from '@/db';
import type { DeleteBudgetLineInput } from '@/modules/budgets/validators';

import { insertAuditLog } from '@/lib/audit/insert-audit-log';
import { notDeleted } from '@/lib/audit/soft-delete';
import { ensureFound } from '@/lib/form/validation';
import { createError } from '@/lib/logging/evlog';
import { budgetLines } from '@/modules/budgets/db/schema';

export async function deleteBudgetLineService(
  database: Db,
  userId: string,
  data: DeleteBudgetLineInput,
) {
  return database.transaction(async (tx) => {
    const existing = await ensureFound(
      tx.query.budgetLines.findFirst({
        where: (t, { and: a, eq: e }) =>
          a(e(t.id, data.id), notDeleted(t.deletedAt)),
        with: { period: { columns: { userId: true } } },
      }),
      'Budget line',
    );

    if (existing.period.userId !== userId) {
      throw createError({
        fix: 'Refresh the page. This item may have been deleted.',
        message: 'Budget line not found.',
        status: 404,
      });
    }

    const [deleted] = await tx
      .update(budgetLines)
      .set({
        deletedAt: new Date(),
        deletedById: userId,
      })
      .where(
        and(eq(budgetLines.id, data.id), notDeleted(budgetLines.deletedAt)),
      )
      .returning();

    if (!deleted) {
      throw createError({
        fix: 'Refresh the page. This budget line may have already been deleted.',
        message: 'Budget line not found.',
        status: 409,
      });
    }

    await insertAuditLog(tx, {
      action: 'delete',
      actorId: userId,
      beforeData: existing as unknown as Record<string, unknown>,
      entityId: data.id,
      tableName: 'budget_lines',
    });
  });
}
