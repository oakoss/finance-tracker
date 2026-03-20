import { expect } from 'vitest';

import type { Db } from '@/db';

import { getBudgetVsActualService } from '@/modules/budgets/services/get-budget-vs-actual';
import { insertAccountWithUser } from '~test/factories/account-with-user.factory';
import { fakeId, type Db as TestDb } from '~test/factories/base';
import { insertBudgetLine } from '~test/factories/budget-line.factory';
import { insertBudgetPeriodWithUser } from '~test/factories/budget-period-with-user.factory';
import { insertBudgetPeriod } from '~test/factories/budget-period.factory';
import { insertCategory } from '~test/factories/category.factory';
import { insertTransaction } from '~test/factories/transaction.factory';
import { insertUser } from '~test/factories/user.factory';
import { test } from '~test/integration-setup';

const asDb = (db: TestDb) => db as unknown as Db;

test('vs-actual — returns budget lines with zero actuals when no transactions', async ({
  serviceDb,
}) => {
  const { period, user } = await insertBudgetPeriodWithUser(serviceDb, {
    period: { month: 3, year: 2025 },
  });
  const category = await insertCategory(serviceDb, { userId: user.id });
  await insertBudgetLine(serviceDb, {
    amountCents: 50_000,
    budgetPeriodId: period.id,
    categoryId: category.id,
  });

  const rows = await getBudgetVsActualService(
    asDb(serviceDb),
    user.id,
    period.id,
  );

  expect(rows).toHaveLength(1);
  expect(rows[0].budgetedCents).toBe(50_000);
  expect(rows[0].actualDebitCents).toBe(0);
  expect(rows[0].actualCreditCents).toBe(0);
  expect(rows[0].categoryName).toBe(category.name);
});

test('vs-actual — sums debit transactions for matching category and month', async ({
  serviceDb,
}) => {
  const { account, user } = await insertAccountWithUser(serviceDb);
  const category = await insertCategory(serviceDb, { userId: user.id });
  const period = await insertBudgetPeriod(serviceDb, {
    month: 6,
    userId: user.id,
    year: 2025,
  });
  await insertBudgetLine(serviceDb, {
    amountCents: 100_000,
    budgetPeriodId: period.id,
    categoryId: category.id,
  });

  await insertTransaction(serviceDb, {
    accountId: account.id,
    amountCents: 30_000,
    categoryId: category.id,
    direction: 'debit',
    postedAt: new Date('2025-06-15T12:00:00Z'),
  });
  await insertTransaction(serviceDb, {
    accountId: account.id,
    amountCents: 20_000,
    categoryId: category.id,
    direction: 'debit',
    postedAt: new Date('2025-06-20T12:00:00Z'),
  });

  const rows = await getBudgetVsActualService(
    asDb(serviceDb),
    user.id,
    period.id,
  );

  expect(rows).toHaveLength(1);
  expect(rows[0].budgetedCents).toBe(100_000);
  expect(rows[0].actualDebitCents).toBe(50_000);
  expect(rows[0].actualCreditCents).toBe(0);
});

test('vs-actual — separates debit and credit sums', async ({ serviceDb }) => {
  const { account, user } = await insertAccountWithUser(serviceDb);
  const category = await insertCategory(serviceDb, { userId: user.id });
  const period = await insertBudgetPeriod(serviceDb, {
    month: 6,
    userId: user.id,
    year: 2025,
  });
  await insertBudgetLine(serviceDb, {
    amountCents: 100_000,
    budgetPeriodId: period.id,
    categoryId: category.id,
  });

  await insertTransaction(serviceDb, {
    accountId: account.id,
    amountCents: 50_000,
    categoryId: category.id,
    direction: 'debit',
    postedAt: new Date('2025-06-10T12:00:00Z'),
  });
  await insertTransaction(serviceDb, {
    accountId: account.id,
    amountCents: 10_000,
    categoryId: category.id,
    direction: 'credit',
    postedAt: new Date('2025-06-15T12:00:00Z'),
  });

  const rows = await getBudgetVsActualService(
    asDb(serviceDb),
    user.id,
    period.id,
  );

  expect(rows).toHaveLength(1);
  expect(rows[0].actualDebitCents).toBe(50_000);
  expect(rows[0].actualCreditCents).toBe(10_000);
});

test('vs-actual — excludes transactions outside the month', async ({
  serviceDb,
}) => {
  const { account, user } = await insertAccountWithUser(serviceDb);
  const category = await insertCategory(serviceDb, { userId: user.id });
  const period = await insertBudgetPeriod(serviceDb, {
    month: 3,
    userId: user.id,
    year: 2025,
  });
  await insertBudgetLine(serviceDb, {
    amountCents: 50_000,
    budgetPeriodId: period.id,
    categoryId: category.id,
  });

  // Before the month
  await insertTransaction(serviceDb, {
    accountId: account.id,
    amountCents: 10_000,
    categoryId: category.id,
    direction: 'debit',
    postedAt: new Date('2025-02-28T23:59:59Z'),
  });
  // After the month
  await insertTransaction(serviceDb, {
    accountId: account.id,
    amountCents: 10_000,
    categoryId: category.id,
    direction: 'debit',
    postedAt: new Date('2025-04-01T00:00:00Z'),
  });
  // Inside the month
  await insertTransaction(serviceDb, {
    accountId: account.id,
    amountCents: 25_000,
    categoryId: category.id,
    direction: 'debit',
    postedAt: new Date('2025-03-15T12:00:00Z'),
  });

  const rows = await getBudgetVsActualService(
    asDb(serviceDb),
    user.id,
    period.id,
  );

  expect(rows[0].actualDebitCents).toBe(25_000);
});

test('vs-actual — excludes soft-deleted transactions', async ({
  serviceDb,
}) => {
  const { account, user } = await insertAccountWithUser(serviceDb);
  const category = await insertCategory(serviceDb, { userId: user.id });
  const period = await insertBudgetPeriod(serviceDb, {
    month: 6,
    userId: user.id,
    year: 2025,
  });
  await insertBudgetLine(serviceDb, {
    amountCents: 50_000,
    budgetPeriodId: period.id,
    categoryId: category.id,
  });

  await insertTransaction(serviceDb, {
    accountId: account.id,
    amountCents: 30_000,
    categoryId: category.id,
    deletedAt: new Date(),
    direction: 'debit',
    postedAt: new Date('2025-06-15T12:00:00Z'),
  });
  await insertTransaction(serviceDb, {
    accountId: account.id,
    amountCents: 20_000,
    categoryId: category.id,
    direction: 'debit',
    postedAt: new Date('2025-06-15T12:00:00Z'),
  });

  const rows = await getBudgetVsActualService(
    asDb(serviceDb),
    user.id,
    period.id,
  );

  expect(rows[0].actualDebitCents).toBe(20_000);
});

test('vs-actual — excludes soft-deleted budget lines', async ({
  serviceDb,
}) => {
  const { period, user } = await insertBudgetPeriodWithUser(serviceDb, {
    period: { month: 6, year: 2025 },
  });
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

  const rows = await getBudgetVsActualService(
    asDb(serviceDb),
    user.id,
    period.id,
  );

  expect(rows).toHaveLength(1);
  expect(rows[0].categoryId).toBe(cat2.id);
});

test('vs-actual — ordered by category name', async ({ serviceDb }) => {
  const { period, user } = await insertBudgetPeriodWithUser(serviceDb, {
    period: { month: 6, year: 2025 },
  });
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

  const rows = await getBudgetVsActualService(
    asDb(serviceDb),
    user.id,
    period.id,
  );

  expect(rows[0].categoryName).toBe('Alpha');
  expect(rows[1].categoryName).toBe('Zebra');
});

test('vs-actual — excludes lines with soft-deleted category', async ({
  serviceDb,
}) => {
  const { period, user } = await insertBudgetPeriodWithUser(serviceDb, {
    period: { month: 6, year: 2025 },
  });
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

  const rows = await getBudgetVsActualService(
    asDb(serviceDb),
    user.id,
    period.id,
  );

  expect(rows).toHaveLength(1);
  expect(rows[0].categoryId).toBe(active.id);
});

test('vs-actual — attributes transactions to correct categories', async ({
  serviceDb,
}) => {
  const { account, user } = await insertAccountWithUser(serviceDb);
  const catA = await insertCategory(serviceDb, {
    name: 'Alpha',
    userId: user.id,
  });
  const catB = await insertCategory(serviceDb, {
    name: 'Beta',
    userId: user.id,
  });
  const period = await insertBudgetPeriod(serviceDb, {
    month: 6,
    userId: user.id,
    year: 2025,
  });
  await insertBudgetLine(serviceDb, {
    amountCents: 50_000,
    budgetPeriodId: period.id,
    categoryId: catA.id,
  });
  await insertBudgetLine(serviceDb, {
    amountCents: 30_000,
    budgetPeriodId: period.id,
    categoryId: catB.id,
  });

  await insertTransaction(serviceDb, {
    accountId: account.id,
    amountCents: 10_000,
    categoryId: catA.id,
    direction: 'debit',
    postedAt: new Date('2025-06-15T12:00:00Z'),
  });
  await insertTransaction(serviceDb, {
    accountId: account.id,
    amountCents: 25_000,
    categoryId: catB.id,
    direction: 'debit',
    postedAt: new Date('2025-06-15T12:00:00Z'),
  });

  const rows = await getBudgetVsActualService(
    asDb(serviceDb),
    user.id,
    period.id,
  );

  expect(rows).toHaveLength(2);
  expect(rows[0].categoryName).toBe('Alpha');
  expect(rows[0].actualDebitCents).toBe(10_000);
  expect(rows[1].categoryName).toBe('Beta');
  expect(rows[1].actualDebitCents).toBe(25_000);
});

test('vs-actual — excludes other users transactions', async ({ serviceDb }) => {
  const { account: myAccount, user } = await insertAccountWithUser(serviceDb);
  const { account: otherAccount } = await insertAccountWithUser(serviceDb);
  const category = await insertCategory(serviceDb, { userId: user.id });
  const period = await insertBudgetPeriod(serviceDb, {
    month: 6,
    userId: user.id,
    year: 2025,
  });
  await insertBudgetLine(serviceDb, {
    amountCents: 50_000,
    budgetPeriodId: period.id,
    categoryId: category.id,
  });

  // My transaction
  await insertTransaction(serviceDb, {
    accountId: myAccount.id,
    amountCents: 10_000,
    categoryId: category.id,
    direction: 'debit',
    postedAt: new Date('2025-06-15T12:00:00Z'),
  });
  // Other user's transaction referencing same categoryId
  await insertTransaction(serviceDb, {
    accountId: otherAccount.id,
    amountCents: 99_000,
    categoryId: category.id,
    direction: 'debit',
    postedAt: new Date('2025-06-15T12:00:00Z'),
  });

  const rows = await getBudgetVsActualService(
    asDb(serviceDb),
    user.id,
    period.id,
  );

  expect(rows).toHaveLength(1);
  expect(rows[0].actualDebitCents).toBe(10_000);
});

test('vs-actual — rejects non-owner period', async ({ serviceDb }) => {
  const { period } = await insertBudgetPeriodWithUser(serviceDb);
  const other = await insertUser(serviceDb);

  await expect(
    getBudgetVsActualService(asDb(serviceDb), other.id, period.id),
  ).rejects.toMatchObject({ status: 404 });
});

test('vs-actual — rejects nonexistent period', async ({ serviceDb }) => {
  const user = await insertUser(serviceDb);

  await expect(
    getBudgetVsActualService(asDb(serviceDb), user.id, fakeId()),
  ).rejects.toMatchObject({ status: 404 });
});

test('vs-actual — rejects soft-deleted period', async ({ serviceDb }) => {
  const { period, user } = await insertBudgetPeriodWithUser(serviceDb, {
    period: { deletedAt: new Date() },
  });

  await expect(
    getBudgetVsActualService(asDb(serviceDb), user.id, period.id),
  ).rejects.toMatchObject({ status: 404 });
});

test('vs-actual — excludes transactions in non-budgeted category', async ({
  serviceDb,
}) => {
  const { account, user } = await insertAccountWithUser(serviceDb);
  const budgeted = await insertCategory(serviceDb, { userId: user.id });
  const unbudgeted = await insertCategory(serviceDb, { userId: user.id });
  const period = await insertBudgetPeriod(serviceDb, {
    month: 6,
    userId: user.id,
    year: 2025,
  });
  await insertBudgetLine(serviceDb, {
    amountCents: 50_000,
    budgetPeriodId: period.id,
    categoryId: budgeted.id,
  });

  await insertTransaction(serviceDb, {
    accountId: account.id,
    amountCents: 10_000,
    categoryId: budgeted.id,
    direction: 'debit',
    postedAt: new Date('2025-06-15T12:00:00Z'),
  });
  await insertTransaction(serviceDb, {
    accountId: account.id,
    amountCents: 99_000,
    categoryId: unbudgeted.id,
    direction: 'debit',
    postedAt: new Date('2025-06-15T12:00:00Z'),
  });

  const rows = await getBudgetVsActualService(
    asDb(serviceDb),
    user.id,
    period.id,
  );

  expect(rows).toHaveLength(1);
  expect(rows[0].categoryId).toBe(budgeted.id);
  expect(rows[0].actualDebitCents).toBe(10_000);
});

test('vs-actual — returns projected columns only', async ({ serviceDb }) => {
  const { period, user } = await insertBudgetPeriodWithUser(serviceDb, {
    period: { month: 6, year: 2025 },
  });
  const category = await insertCategory(serviceDb, { userId: user.id });
  await insertBudgetLine(serviceDb, {
    budgetPeriodId: period.id,
    categoryId: category.id,
  });

  const rows = await getBudgetVsActualService(
    asDb(serviceDb),
    user.id,
    period.id,
  );

  expect(rows).toHaveLength(1);
  const keys = Object.keys(rows[0]).toSorted();
  expect(keys).toEqual(
    [
      'actualCreditCents',
      'actualDebitCents',
      'budgetLineId',
      'budgetedCents',
      'categoryId',
      'categoryName',
    ].toSorted(),
  );
});
