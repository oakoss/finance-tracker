import { expect } from 'vitest';

import type { Db } from '@/db';

import { listBudgetLinesService } from '@/modules/budgets/services/list-budget-lines';
import type { Db as TestDb } from '~test/factories/base';
import { insertBudgetLine } from '~test/factories/budget-line.factory';
import { insertBudgetPeriodWithUser } from '~test/factories/budget-period-with-user.factory';
import { insertCategory } from '~test/factories/category.factory';
import { insertUser } from '~test/factories/user.factory';
import { test } from '~test/integration-setup';

const asDb = (db: TestDb) => db as unknown as Db;

test('list — returns active lines for period', async ({ serviceDb }) => {
  const { period, user } = await insertBudgetPeriodWithUser(serviceDb);
  const category = await insertCategory(serviceDb, { userId: user.id });
  await insertBudgetLine(serviceDb, {
    budgetPeriodId: period.id,
    categoryId: category.id,
  });

  const rows = await listBudgetLinesService(
    asDb(serviceDb),
    user.id,
    period.id,
  );

  expect(rows).toHaveLength(1);
  expect(rows[0].categoryId).toBe(category.id);
  expect(rows[0].categoryName).toBe(category.name);
});

test('list — excludes soft-deleted lines', async ({ serviceDb }) => {
  const { period, user } = await insertBudgetPeriodWithUser(serviceDb);
  const cat1 = await insertCategory(serviceDb, { userId: user.id });
  const cat2 = await insertCategory(serviceDb, { userId: user.id });
  await insertBudgetLine(serviceDb, {
    budgetPeriodId: period.id,
    categoryId: cat1.id,
    deletedAt: new Date(),
  });
  await insertBudgetLine(serviceDb, {
    budgetPeriodId: period.id,
    categoryId: cat2.id,
  });

  const rows = await listBudgetLinesService(
    asDb(serviceDb),
    user.id,
    period.id,
  );

  expect(rows).toHaveLength(1);
  expect(rows[0].categoryId).toBe(cat2.id);
});

test('list — excludes lines with soft-deleted category', async ({
  serviceDb,
}) => {
  const { period, user } = await insertBudgetPeriodWithUser(serviceDb);
  const active = await insertCategory(serviceDb, { userId: user.id });
  const deleted = await insertCategory(serviceDb, {
    deletedAt: new Date(),
    userId: user.id,
  });
  await insertBudgetLine(serviceDb, {
    budgetPeriodId: period.id,
    categoryId: active.id,
  });
  await insertBudgetLine(serviceDb, {
    budgetPeriodId: period.id,
    categoryId: deleted.id,
  });

  const rows = await listBudgetLinesService(
    asDb(serviceDb),
    user.id,
    period.id,
  );

  expect(rows).toHaveLength(1);
  expect(rows[0].categoryId).toBe(active.id);
});

test('list — rejects non-owner period', async ({ serviceDb }) => {
  const { period } = await insertBudgetPeriodWithUser(serviceDb);
  const other = await insertUser(serviceDb);

  await expect(
    listBudgetLinesService(asDb(serviceDb), other.id, period.id),
  ).rejects.toMatchObject({ status: 404 });
});

test('list — ordered by category name', async ({ serviceDb }) => {
  const { period, user } = await insertBudgetPeriodWithUser(serviceDb);
  const catZ = await insertCategory(serviceDb, {
    name: 'Zebra',
    userId: user.id,
  });
  const catA = await insertCategory(serviceDb, {
    name: 'Alpha',
    userId: user.id,
  });
  await insertBudgetLine(serviceDb, {
    budgetPeriodId: period.id,
    categoryId: catZ.id,
  });
  await insertBudgetLine(serviceDb, {
    budgetPeriodId: period.id,
    categoryId: catA.id,
  });

  const rows = await listBudgetLinesService(
    asDb(serviceDb),
    user.id,
    period.id,
  );

  expect(rows).toHaveLength(2);
  expect(rows[0].categoryName).toBe('Alpha');
  expect(rows[1].categoryName).toBe('Zebra');
});

test('list — returns projected columns only', async ({ serviceDb }) => {
  const { period, user } = await insertBudgetPeriodWithUser(serviceDb);
  const category = await insertCategory(serviceDb, { userId: user.id });
  await insertBudgetLine(serviceDb, {
    budgetPeriodId: period.id,
    categoryId: category.id,
  });

  const rows = await listBudgetLinesService(
    asDb(serviceDb),
    user.id,
    period.id,
  );

  expect(rows).toHaveLength(1);
  const keys = Object.keys(rows[0]);
  expect(keys).toEqual([
    'amountCents',
    'categoryId',
    'categoryName',
    'id',
    'notes',
  ]);
});
