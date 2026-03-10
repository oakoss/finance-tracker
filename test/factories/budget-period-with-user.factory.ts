import type { User, UserInsert } from '@/modules/auth/models';
import type {
  BudgetPeriod,
  BudgetPeriodInsert,
} from '@/modules/budgets/models';

import type { Db } from '~test/factories/base';
import { insertBudgetPeriod } from '~test/factories/budget-period.factory';
import { insertUser } from '~test/factories/user.factory';

type BudgetPeriodWithUser = {
  period: BudgetPeriod;
  user: User;
};

type BudgetPeriodWithUserOverrides = {
  period?: Omit<Partial<BudgetPeriodInsert>, 'userId'>;
  user?: Partial<UserInsert>;
};

export async function insertBudgetPeriodWithUser(
  db: Db,
  overrides?: BudgetPeriodWithUserOverrides,
): Promise<BudgetPeriodWithUser> {
  const user = await insertUser(db, overrides?.user);
  const period = await insertBudgetPeriod(db, {
    userId: user.id,
    ...overrides?.period,
  });
  return { period, user };
}
