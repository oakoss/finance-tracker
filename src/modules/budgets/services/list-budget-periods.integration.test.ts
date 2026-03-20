import { expect } from 'vitest';

import type { Db } from '@/db';

import { listBudgetPeriodsService } from '@/modules/budgets/services/list-budget-periods';
import type { Db as TestDb } from '~test/factories/base';
import { insertBudgetPeriodWithUser } from '~test/factories/budget-period-with-user.factory';
import { insertBudgetPeriod } from '~test/factories/budget-period.factory';
import { test } from '~test/integration-setup';

const asDb = (db: TestDb) => db as unknown as Db;

test('list — returns active periods for user', async ({ serviceDb }) => {
  const { user } = await insertBudgetPeriodWithUser(serviceDb, {
    period: { month: 3, year: 2025 },
  });

  const rows = await listBudgetPeriodsService(asDb(serviceDb), user.id);

  expect(rows).toHaveLength(1);
  expect(rows[0].year).toBe(2025);
  expect(rows[0].month).toBe(3);
});

test('list — excludes soft-deleted', async ({ serviceDb }) => {
  const { user } = await insertBudgetPeriodWithUser(serviceDb, {
    period: { deletedAt: new Date() },
  });
  await insertBudgetPeriod(serviceDb, { userId: user.id });

  const rows = await listBudgetPeriodsService(asDb(serviceDb), user.id);

  expect(rows).toHaveLength(1);
});

test('list — isolates by user', async ({ serviceDb }) => {
  const { user: user1 } = await insertBudgetPeriodWithUser(serviceDb);
  await insertBudgetPeriodWithUser(serviceDb);

  const rows = await listBudgetPeriodsService(asDb(serviceDb), user1.id);

  expect(rows).toHaveLength(1);
});

test('list — ordered by year ASC, month ASC', async ({ serviceDb }) => {
  const { user } = await insertBudgetPeriodWithUser(serviceDb, {
    period: { month: 12, year: 2025 },
  });
  await insertBudgetPeriod(serviceDb, {
    month: 1,
    userId: user.id,
    year: 2026,
  });
  await insertBudgetPeriod(serviceDb, {
    month: 6,
    userId: user.id,
    year: 2025,
  });

  const rows = await listBudgetPeriodsService(asDb(serviceDb), user.id);

  expect(rows).toHaveLength(3);
  expect(rows[0]).toMatchObject({ month: 6, year: 2025 });
  expect(rows[1]).toMatchObject({ month: 12, year: 2025 });
  expect(rows[2]).toMatchObject({ month: 1, year: 2026 });
});

test('list — returns projected columns only', async ({ serviceDb }) => {
  const { user } = await insertBudgetPeriodWithUser(serviceDb);

  const rows = await listBudgetPeriodsService(asDb(serviceDb), user.id);

  expect(rows).toHaveLength(1);
  const keys = Object.keys(rows[0]);
  expect(keys).toEqual(['id', 'month', 'notes', 'year']);
});
