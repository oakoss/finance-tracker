import { and, eq } from 'drizzle-orm';
import { expect } from 'vitest';

import type { Db } from '@/db';

import { auditLogs } from '@/db/schema';
import { createBudgetLineService } from '@/modules/budgets/services/create-budget-line';
import type { Db as TestDb } from '~test/factories/base';
import { insertBudgetLine } from '~test/factories/budget-line.factory';
import { insertBudgetPeriodWithUser } from '~test/factories/budget-period-with-user.factory';
import { insertCategory } from '~test/factories/category.factory';
import { insertUser } from '~test/factories/user.factory';
import { test } from '~test/integration-setup';

const asDb = (db: TestDb) => db as unknown as Db;

test('create — inserts with required fields', async ({ serviceDb }) => {
  const { period, user } = await insertBudgetPeriodWithUser(serviceDb);
  const category = await insertCategory(serviceDb, { userId: user.id });

  const result = await createBudgetLineService(asDb(serviceDb), user.id, {
    amountCents: 50_000,
    budgetPeriodId: period.id,
    categoryId: category.id,
  });

  expect(result.id).toBeDefined();
  expect(result.amountCents).toBe(50_000);
  expect(result.budgetPeriodId).toBe(period.id);
  expect(result.categoryId).toBe(category.id);
  expect(result.notes).toBeNull();
});

test('create — inserts with notes', async ({ serviceDb }) => {
  const { period, user } = await insertBudgetPeriodWithUser(serviceDb);
  const category = await insertCategory(serviceDb, { userId: user.id });

  const result = await createBudgetLineService(asDb(serviceDb), user.id, {
    amountCents: 10_000,
    budgetPeriodId: period.id,
    categoryId: category.id,
    notes: 'Groceries target',
  });

  expect(result.notes).toBe('Groceries target');
});

test('create — rejects non-owner period', async ({ serviceDb }) => {
  const { period } = await insertBudgetPeriodWithUser(serviceDb);
  const other = await insertUser(serviceDb);
  const category = await insertCategory(serviceDb, { userId: other.id });

  await expect(
    createBudgetLineService(asDb(serviceDb), other.id, {
      amountCents: 10_000,
      budgetPeriodId: period.id,
      categoryId: category.id,
    }),
  ).rejects.toMatchObject({ status: 404 });
});

test('create — rejects non-owner category', async ({ serviceDb }) => {
  const { period, user } = await insertBudgetPeriodWithUser(serviceDb);
  const { category: otherCat } = await (async () => {
    const otherUser = await insertUser(serviceDb);
    const cat = await insertCategory(serviceDb, { userId: otherUser.id });
    return { category: cat };
  })();

  await expect(
    createBudgetLineService(asDb(serviceDb), user.id, {
      amountCents: 10_000,
      budgetPeriodId: period.id,
      categoryId: otherCat.id,
    }),
  ).rejects.toMatchObject({ status: 404 });
});

test('create — rejects soft-deleted period', async ({ serviceDb }) => {
  const { period, user } = await insertBudgetPeriodWithUser(serviceDb, {
    period: { deletedAt: new Date() },
  });
  const category = await insertCategory(serviceDb, { userId: user.id });

  await expect(
    createBudgetLineService(asDb(serviceDb), user.id, {
      amountCents: 10_000,
      budgetPeriodId: period.id,
      categoryId: category.id,
    }),
  ).rejects.toMatchObject({ status: 404 });
});

test('create — rejects soft-deleted category', async ({ serviceDb }) => {
  const { period, user } = await insertBudgetPeriodWithUser(serviceDb);
  const category = await insertCategory(serviceDb, {
    deletedAt: new Date(),
    userId: user.id,
  });

  await expect(
    createBudgetLineService(asDb(serviceDb), user.id, {
      amountCents: 10_000,
      budgetPeriodId: period.id,
      categoryId: category.id,
    }),
  ).rejects.toMatchObject({ status: 404 });
});

test('create — rejects duplicate category in same period', async ({
  serviceDb,
}) => {
  const { period, user } = await insertBudgetPeriodWithUser(serviceDb);
  const category = await insertCategory(serviceDb, { userId: user.id });
  await insertBudgetLine(serviceDb, {
    budgetPeriodId: period.id,
    categoryId: category.id,
  });

  await expect(
    createBudgetLineService(asDb(serviceDb), user.id, {
      amountCents: 20_000,
      budgetPeriodId: period.id,
      categoryId: category.id,
    }),
  ).rejects.toThrow();
});

test('create — writes audit log', async ({ serviceDb }) => {
  const { period, user } = await insertBudgetPeriodWithUser(serviceDb);
  const category = await insertCategory(serviceDb, { userId: user.id });

  const result = await createBudgetLineService(asDb(serviceDb), user.id, {
    amountCents: 10_000,
    budgetPeriodId: period.id,
    categoryId: category.id,
  });

  const logs = await serviceDb
    .select()
    .from(auditLogs)
    .where(
      and(
        eq(auditLogs.recordId, result.id),
        eq(auditLogs.tableName, 'budget_lines'),
        eq(auditLogs.action, 'create'),
      ),
    );

  expect(logs).toHaveLength(1);
  expect(logs[0].actorId).toBe(user.id);
});
