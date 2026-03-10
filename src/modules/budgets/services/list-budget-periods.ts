import { and, asc, eq } from 'drizzle-orm';

import type { Db } from '@/db';

import { notDeleted } from '@/lib/audit/soft-delete';
import { budgetPeriods } from '@/modules/budgets/db/schema';

export async function listBudgetPeriodsService(database: Db, userId: string) {
  return database
    .select({
      id: budgetPeriods.id,
      month: budgetPeriods.month,
      notes: budgetPeriods.notes,
      year: budgetPeriods.year,
    })
    .from(budgetPeriods)
    .where(
      and(
        eq(budgetPeriods.userId, userId),
        notDeleted(budgetPeriods.deletedAt),
      ),
    )
    .orderBy(asc(budgetPeriods.year), asc(budgetPeriods.month));
}
