import { and, eq } from 'drizzle-orm';

import type { Db } from '@/db';
import type { CopyBudgetPeriodInput } from '@/modules/budgets/validators';

import { insertAuditLog } from '@/lib/audit/insert-audit-log';
import { notDeleted } from '@/lib/audit/soft-delete';
import { ensureFound } from '@/lib/form/validation';
import { createError } from '@/lib/logging/evlog';
import { budgetLines, budgetPeriods } from '@/modules/budgets/db/schema';
import { categories } from '@/modules/categories/db/schema';

export async function copyBudgetPeriodService(
  database: Db,
  userId: string,
  data: CopyBudgetPeriodInput,
) {
  return database.transaction(async (tx) => {
    await ensureFound(
      tx.query.budgetPeriods.findFirst({
        where: (t, { and: a, eq: e }) =>
          a(
            e(t.id, data.sourcePeriodId),
            e(t.userId, userId),
            notDeleted(t.deletedAt),
          ),
      }),
      'Source budget period',
    );

    const sourceLines = await tx
      .select({
        amountCents: budgetLines.amountCents,
        categoryId: budgetLines.categoryId,
        notes: budgetLines.notes,
      })
      .from(budgetLines)
      .innerJoin(categories, eq(budgetLines.categoryId, categories.id))
      .where(
        and(
          eq(budgetLines.budgetPeriodId, data.sourcePeriodId),
          notDeleted(budgetLines.deletedAt),
          notDeleted(categories.deletedAt),
        ),
      );

    const [newPeriod] = await tx
      .insert(budgetPeriods)
      .values({
        createdById: userId,
        month: data.month,
        userId,
        year: data.year,
      })
      .returning();

    if (!newPeriod) {
      throw createError({
        fix: 'Try again. If the problem persists, contact support.',
        message: 'Failed to create budget period.',
        status: 500,
      });
    }

    await insertAuditLog(tx, {
      action: 'create',
      actorId: userId,
      afterData: newPeriod as unknown as Record<string, unknown>,
      entityId: newPeriod.id,
      tableName: 'budget_periods',
    });

    for (const line of sourceLines) {
      const [newLine] = await tx
        .insert(budgetLines)
        .values({
          amountCents: line.amountCents,
          budgetPeriodId: newPeriod.id,
          categoryId: line.categoryId,
          createdById: userId,
          notes: line.notes,
        })
        .returning();

      if (!newLine) {
        throw createError({
          fix: 'Try again. If the problem persists, contact support.',
          message: `Failed to copy budget line for category ${line.categoryId}.`,
          status: 500,
        });
      }

      await insertAuditLog(tx, {
        action: 'create',
        actorId: userId,
        afterData: newLine as unknown as Record<string, unknown>,
        entityId: newLine.id,
        tableName: 'budget_lines',
      });
    }

    return newPeriod;
  });
}
