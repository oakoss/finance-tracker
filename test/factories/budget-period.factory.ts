import { faker } from '@faker-js/faker';

import type {
  BudgetPeriod,
  BudgetPeriodInsert,
} from '@/modules/budgets/models';

import { budgetPeriods } from '@/db/schema';
import { type Db, fakeDate, fakeId } from '~test/factories/base';

export function createBudgetPeriod(
  overrides?: Partial<BudgetPeriod>,
): BudgetPeriod {
  const now = fakeDate();
  return {
    createdAt: now,
    createdById: null,
    deletedAt: null,
    deletedById: null,
    id: fakeId(),
    month: faker.number.int({ max: 12, min: 1 }),
    notes: null,
    updatedAt: now,
    updatedById: null,
    userId: fakeId(),
    year: faker.number.int({ max: 2030, min: 2024 }),
    ...overrides,
  };
}

export async function insertBudgetPeriod(
  db: Db,
  overrides: Pick<BudgetPeriodInsert, 'userId'> & Partial<BudgetPeriodInsert>,
): Promise<BudgetPeriod> {
  const data: BudgetPeriodInsert = {
    month: faker.number.int({ max: 12, min: 1 }),
    year: faker.number.int({ max: 2030, min: 2024 }),
    ...overrides,
  };
  const [row] = await db.insert(budgetPeriods).values(data).returning();
  return row;
}
