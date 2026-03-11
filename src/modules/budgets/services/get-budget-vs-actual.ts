import { and, asc, eq, gte, inArray, lt, sql } from 'drizzle-orm';

import type { Db } from '@/db';

import { notDeleted } from '@/lib/audit/soft-delete';
import { ensureFound } from '@/lib/form/validation';
import { ledgerAccounts } from '@/modules/accounts/db/schema';
import { budgetLines } from '@/modules/budgets/db/schema';
import { categories } from '@/modules/categories/db/schema';
import { transactions } from '@/modules/transactions/db/schema';

export async function getBudgetVsActualService(
  database: Db,
  userId: string,
  budgetPeriodId: string,
) {
  const period = await ensureFound(
    database.query.budgetPeriods.findFirst({
      columns: { month: true, year: true },
      where: (t, { and: a, eq: e }) =>
        a(
          e(t.id, budgetPeriodId),
          e(t.userId, userId),
          notDeleted(t.deletedAt),
        ),
    }),
    'Budget period',
  );

  const startDate = new Date(Date.UTC(period.year, period.month - 1, 1));
  const endDate = new Date(Date.UTC(period.year, period.month, 1));

  const userAccountIds = database
    .select({ id: ledgerAccounts.id })
    .from(ledgerAccounts)
    .where(eq(ledgerAccounts.userId, userId));

  return database
    .select({
      actualCreditCents:
        sql<number>`coalesce(sum(${transactions.amountCents}) filter (where ${transactions.direction} = 'credit'), 0)`.mapWith(
          Number,
        ),
      actualDebitCents:
        sql<number>`coalesce(sum(${transactions.amountCents}) filter (where ${transactions.direction} = 'debit'), 0)`.mapWith(
          Number,
        ),
      budgetedCents: budgetLines.amountCents,
      budgetLineId: budgetLines.id,
      categoryId: budgetLines.categoryId,
      categoryName: categories.name,
    })
    .from(budgetLines)
    .innerJoin(categories, eq(budgetLines.categoryId, categories.id))
    .leftJoin(
      transactions,
      and(
        eq(transactions.categoryId, budgetLines.categoryId),
        inArray(transactions.accountId, userAccountIds),
        gte(transactions.postedAt, startDate),
        lt(transactions.postedAt, endDate),
        notDeleted(transactions.deletedAt),
      ),
    )
    .where(
      and(
        eq(budgetLines.budgetPeriodId, budgetPeriodId),
        notDeleted(budgetLines.deletedAt),
        notDeleted(categories.deletedAt),
      ),
    )
    .groupBy(
      budgetLines.id,
      budgetLines.amountCents,
      budgetLines.categoryId,
      categories.name,
    )
    .orderBy(asc(categories.name));
}
