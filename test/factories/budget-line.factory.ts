import { faker } from '@faker-js/faker';

import type { BudgetLine, BudgetLineInsert } from '@/modules/budgets/models';

import { budgetLines } from '@/db/schema';
import { type Db, fakeCents, fakeDate, fakeId } from '~test/factories/base';

export function createBudgetLine(overrides?: Partial<BudgetLine>): BudgetLine {
  const now = fakeDate();
  return {
    amountCents: fakeCents(),
    budgetPeriodId: fakeId(),
    categoryId: fakeId(),
    createdAt: now,
    createdById: null,
    deletedAt: null,
    deletedById: null,
    id: fakeId(),
    notes: null,
    updatedAt: now,
    updatedById: null,
    ...overrides,
  };
}

export async function insertBudgetLine(
  db: Db,
  overrides: Pick<BudgetLineInsert, 'budgetPeriodId' | 'categoryId'> &
    Partial<BudgetLineInsert>,
): Promise<BudgetLine> {
  const data: BudgetLineInsert = {
    amountCents: faker.number.int({ max: 100_000, min: 100 }),
    ...overrides,
  };
  const [row] = await db.insert(budgetLines).values(data).returning();
  return row;
}
