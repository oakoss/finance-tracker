import { and, eq } from 'drizzle-orm';

import type { Db } from '@/db';
import type { UpdateBudgetLineInput } from '@/modules/budgets/validators';

import { insertAuditLog } from '@/lib/audit/insert-audit-log';
import { notDeleted } from '@/lib/audit/soft-delete';
import { ensureFound } from '@/lib/form/validation';
import { createError } from '@/lib/logging/evlog';
import { budgetLines } from '@/modules/budgets/db/schema';

export async function updateBudgetLineService(
  database: Db,
  userId: string,
  data: UpdateBudgetLineInput,
) {
  return database.transaction(async (tx) => {
    const { id, ...fields } = data;

    const existing = await ensureFound(
      tx.query.budgetLines.findFirst({
        where: (t, { and: a, eq: e }) =>
          a(e(t.id, id), notDeleted(t.deletedAt)),
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

    if (fields.categoryId) {
      await ensureFound(
        tx.query.categories.findFirst({
          where: (t, { and: a, eq: e }) =>
            a(
              e(t.id, fields.categoryId!),
              e(t.userId, userId),
              notDeleted(t.deletedAt),
            ),
        }),
        'Category',
      );
    }

    const [updated] = await tx
      .update(budgetLines)
      .set({
        ...fields,
        updatedById: userId,
      })
      .where(and(eq(budgetLines.id, id), notDeleted(budgetLines.deletedAt)))
      .returning();

    if (!updated) {
      throw createError({
        fix: 'Refresh the page. This budget line may have been deleted.',
        message: 'Budget line not found.',
        status: 409,
      });
    }

    await insertAuditLog(tx, {
      action: 'update',
      actorId: userId,
      afterData: updated as unknown as Record<string, unknown>,
      beforeData: existing as unknown as Record<string, unknown>,
      entityId: id,
      tableName: 'budget_lines',
    });

    return updated;
  });
}
