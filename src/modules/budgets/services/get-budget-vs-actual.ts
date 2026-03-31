import { and, asc, eq, sql } from 'drizzle-orm';

import type { Db } from '@/db';

import { notDeleted } from '@/lib/audit/soft-delete';
import { ensureFound } from '@/lib/form/validation';
import { ledgerAccounts } from '@/modules/accounts/db/schema';
import { budgetLines } from '@/modules/budgets/db/schema';
import { categories } from '@/modules/categories/db/schema';
import { splitLines, transactions } from '@/modules/transactions/db/schema';

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

  // Raw SQL UNION ALL: non-split rows use transaction.categoryId,
  // split rows use split_lines.categoryId. Drizzle's .unionAll()
  // doesn't support .as() for subqueries, so we drop to sql``.
  const actualSubquery = sql`
    (
        SELECT ${transactions.categoryId}, ${transactions.amountCents}, ${transactions.direction}
        FROM ${transactions}
        WHERE ${transactions.accountId} IN (${userAccountIds})
          AND ${transactions.postedAt} >= ${startDate}
          AND ${transactions.postedAt} < ${endDate}
          AND ${transactions.deletedAt} IS NULL
          AND ${transactions.isSplit} = false
        UNION ALL
        SELECT ${splitLines.categoryId}, ${splitLines.amountCents}, ${transactions.direction}
        FROM ${splitLines}
        INNER JOIN ${transactions} ON ${splitLines.transactionId} = ${transactions.id}
        WHERE ${transactions.accountId} IN (${userAccountIds})
          AND ${transactions.postedAt} >= ${startDate}
          AND ${transactions.postedAt} < ${endDate}
          AND ${transactions.deletedAt} IS NULL
          AND ${transactions.isSplit} = true
      )
  `;

  return database
    .select({
      actualCreditCents:
        sql<number>`coalesce(sum(aa.amount_cents) filter (where aa.direction = 'credit'), 0)`.mapWith(
          Number,
        ),
      actualDebitCents:
        sql<number>`coalesce(sum(aa.amount_cents) filter (where aa.direction = 'debit'), 0)`.mapWith(
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
      sql`${actualSubquery} as aa`,
      sql`aa.category_id = ${budgetLines.categoryId}`,
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
