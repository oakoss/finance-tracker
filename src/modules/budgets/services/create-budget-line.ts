import type { Db } from '@/db';
import type { CreateBudgetLineInput } from '@/modules/budgets/validators';

import { insertAuditLog } from '@/lib/audit/insert-audit-log';
import { notDeleted } from '@/lib/audit/soft-delete';
import { ensureFound } from '@/lib/form/validation';
import { createError } from '@/lib/logging/evlog';
import { budgetLines } from '@/modules/budgets/db/schema';

export async function createBudgetLineService(
  database: Db,
  userId: string,
  data: CreateBudgetLineInput,
) {
  return database.transaction(async (tx) => {
    await ensureFound(
      tx.query.budgetPeriods.findFirst({
        where: (t, { and: a, eq: e }) =>
          a(
            e(t.id, data.budgetPeriodId),
            e(t.userId, userId),
            notDeleted(t.deletedAt),
          ),
      }),
      'Budget period',
    );

    await ensureFound(
      tx.query.categories.findFirst({
        where: (t, { and: a, eq: e }) =>
          a(
            e(t.id, data.categoryId),
            e(t.userId, userId),
            notDeleted(t.deletedAt),
          ),
      }),
      'Category',
    );

    const [line] = await tx
      .insert(budgetLines)
      .values({
        amountCents: data.amountCents,
        budgetPeriodId: data.budgetPeriodId,
        categoryId: data.categoryId,
        createdById: userId,
        notes: data.notes ?? null,
      })
      .returning();

    if (!line) {
      throw createError({
        fix: 'Try again. If the problem persists, contact support.',
        message: 'Failed to create budget line.',
        status: 500,
      });
    }

    await insertAuditLog(tx, {
      action: 'create',
      actorId: userId,
      afterData: line as unknown as Record<string, unknown>,
      entityId: line.id,
      tableName: 'budget_lines',
    });

    return line;
  });
}
