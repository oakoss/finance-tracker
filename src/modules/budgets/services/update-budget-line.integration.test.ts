import { and, eq } from 'drizzle-orm';
import { expect } from 'vitest';

import type { Db } from '@/db';

import { auditLogs } from '@/db/schema';
import { updateBudgetLineService } from '@/modules/budgets/services/update-budget-line';
import { fakeId, type Db as TestDb } from '~test/factories/base';
import { insertBudgetLine } from '~test/factories/budget-line.factory';
import { insertBudgetPeriodWithUser } from '~test/factories/budget-period-with-user.factory';
import { insertCategory } from '~test/factories/category.factory';
import { insertUser } from '~test/factories/user.factory';
import { test } from '~test/integration-setup';

const asDb = (db: TestDb) => db as unknown as Db;

test('update — updates amount', async ({ serviceDb }) => {
  const { period, user } = await insertBudgetPeriodWithUser(serviceDb);
  const category = await insertCategory(serviceDb, { userId: user.id });
  const line = await insertBudgetLine(serviceDb, {
    amountCents: 10_000,
    budgetPeriodId: period.id,
    categoryId: category.id,
  });

  const updated = await updateBudgetLineService(asDb(serviceDb), user.id, {
    amountCents: 25_000,
    id: line.id,
  });

  expect(updated.amountCents).toBe(25_000);
});

test('update — clears notes with null', async ({ serviceDb }) => {
  const { period, user } = await insertBudgetPeriodWithUser(serviceDb);
  const category = await insertCategory(serviceDb, { userId: user.id });
  const line = await insertBudgetLine(serviceDb, {
    budgetPeriodId: period.id,
    categoryId: category.id,
    notes: 'Old notes',
  });

  const updated = await updateBudgetLineService(asDb(serviceDb), user.id, {
    id: line.id,
    notes: null,
  });

  expect(updated.notes).toBeNull();
});

test('update — changes category', async ({ serviceDb }) => {
  const { period, user } = await insertBudgetPeriodWithUser(serviceDb);
  const cat1 = await insertCategory(serviceDb, { userId: user.id });
  const cat2 = await insertCategory(serviceDb, { userId: user.id });
  const line = await insertBudgetLine(serviceDb, {
    budgetPeriodId: period.id,
    categoryId: cat1.id,
  });

  const updated = await updateBudgetLineService(asDb(serviceDb), user.id, {
    categoryId: cat2.id,
    id: line.id,
  });

  expect(updated.categoryId).toBe(cat2.id);
});

test('update — rejects nonexistent id', async ({ serviceDb }) => {
  const user = await insertUser(serviceDb);

  await expect(
    updateBudgetLineService(asDb(serviceDb), user.id, {
      amountCents: 10_000,
      id: fakeId(),
    }),
  ).rejects.toMatchObject({ status: 404 });
});

test('update — rejects non-owner', async ({ serviceDb }) => {
  const { period, user } = await insertBudgetPeriodWithUser(serviceDb);
  const category = await insertCategory(serviceDb, { userId: user.id });
  const line = await insertBudgetLine(serviceDb, {
    budgetPeriodId: period.id,
    categoryId: category.id,
  });
  const other = await insertUser(serviceDb);

  await expect(
    updateBudgetLineService(asDb(serviceDb), other.id, {
      amountCents: 99_999,
      id: line.id,
    }),
  ).rejects.toMatchObject({ status: 404 });
});

test('update — rejects soft-deleted line', async ({ serviceDb }) => {
  const { period, user } = await insertBudgetPeriodWithUser(serviceDb);
  const category = await insertCategory(serviceDb, { userId: user.id });
  const line = await insertBudgetLine(serviceDb, {
    budgetPeriodId: period.id,
    categoryId: category.id,
    deletedAt: new Date(),
  });

  await expect(
    updateBudgetLineService(asDb(serviceDb), user.id, {
      amountCents: 10_000,
      id: line.id,
    }),
  ).rejects.toMatchObject({ status: 404 });
});

test('update — rejects soft-deleted category', async ({ serviceDb }) => {
  const { period, user } = await insertBudgetPeriodWithUser(serviceDb);
  const category = await insertCategory(serviceDb, { userId: user.id });
  const line = await insertBudgetLine(serviceDb, {
    budgetPeriodId: period.id,
    categoryId: category.id,
  });
  const deleted = await insertCategory(serviceDb, {
    deletedAt: new Date(),
    userId: user.id,
  });

  await expect(
    updateBudgetLineService(asDb(serviceDb), user.id, {
      categoryId: deleted.id,
      id: line.id,
    }),
  ).rejects.toMatchObject({ status: 404 });
});

test('update — rejects duplicate category in same period', async ({
  serviceDb,
}) => {
  const { period, user } = await insertBudgetPeriodWithUser(serviceDb);
  const cat1 = await insertCategory(serviceDb, { userId: user.id });
  const cat2 = await insertCategory(serviceDb, { userId: user.id });
  const line = await insertBudgetLine(serviceDb, {
    budgetPeriodId: period.id,
    categoryId: cat1.id,
  });
  await insertBudgetLine(serviceDb, {
    budgetPeriodId: period.id,
    categoryId: cat2.id,
  });

  await expect(
    updateBudgetLineService(asDb(serviceDb), user.id, {
      categoryId: cat2.id,
      id: line.id,
    }),
  ).rejects.toThrow();
});

test('update — rejects non-owner category', async ({ serviceDb }) => {
  const { period, user } = await insertBudgetPeriodWithUser(serviceDb);
  const category = await insertCategory(serviceDb, { userId: user.id });
  const line = await insertBudgetLine(serviceDb, {
    budgetPeriodId: period.id,
    categoryId: category.id,
  });
  const otherUser = await insertUser(serviceDb);
  const otherCat = await insertCategory(serviceDb, { userId: otherUser.id });

  await expect(
    updateBudgetLineService(asDb(serviceDb), user.id, {
      categoryId: otherCat.id,
      id: line.id,
    }),
  ).rejects.toMatchObject({ status: 404 });
});

test('update — writes audit log', async ({ serviceDb }) => {
  const { period, user } = await insertBudgetPeriodWithUser(serviceDb);
  const category = await insertCategory(serviceDb, { userId: user.id });
  const line = await insertBudgetLine(serviceDb, {
    budgetPeriodId: period.id,
    categoryId: category.id,
  });

  await updateBudgetLineService(asDb(serviceDb), user.id, {
    amountCents: 30_000,
    id: line.id,
  });

  const logs = await serviceDb
    .select()
    .from(auditLogs)
    .where(
      and(
        eq(auditLogs.recordId, line.id),
        eq(auditLogs.tableName, 'budget_lines'),
        eq(auditLogs.action, 'update'),
      ),
    );

  expect(logs).toHaveLength(1);
  expect(logs[0].actorId).toBe(user.id);
});
