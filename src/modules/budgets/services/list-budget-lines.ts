import { and, asc, eq } from 'drizzle-orm';

import type { Db } from '@/db';

import { notDeleted } from '@/lib/audit/soft-delete';
import { ensureFound } from '@/lib/form/validation';
import { budgetLines } from '@/modules/budgets/db/schema';
import { categories } from '@/modules/categories/db/schema';

export async function listBudgetLinesService(
  database: Db,
  userId: string,
  budgetPeriodId: string,
) {
  await ensureFound(
    database.query.budgetPeriods.findFirst({
      where: (t, { and: a, eq: e }) =>
        a(
          e(t.id, budgetPeriodId),
          e(t.userId, userId),
          notDeleted(t.deletedAt),
        ),
    }),
    'Budget period',
  );

  return database
    .select({
      amountCents: budgetLines.amountCents,
      categoryId: budgetLines.categoryId,
      categoryName: categories.name,
      id: budgetLines.id,
      notes: budgetLines.notes,
    })
    .from(budgetLines)
    .innerJoin(categories, eq(budgetLines.categoryId, categories.id))
    .where(
      and(
        eq(budgetLines.budgetPeriodId, budgetPeriodId),
        notDeleted(budgetLines.deletedAt),
        notDeleted(categories.deletedAt),
      ),
    )
    .orderBy(asc(categories.name));
}
