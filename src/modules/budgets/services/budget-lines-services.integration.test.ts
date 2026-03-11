import { and, eq } from 'drizzle-orm';
import { expect } from 'vitest';

import type { Db } from '@/db';

import { auditLogs } from '@/db/schema';
import { notDeleted } from '@/lib/audit/soft-delete';
import { budgetLines } from '@/modules/budgets/db/schema';
import { createBudgetLineService } from '@/modules/budgets/services/create-budget-line';
import { deleteBudgetLineService } from '@/modules/budgets/services/delete-budget-line';
import { listBudgetLinesService } from '@/modules/budgets/services/list-budget-lines';
import { updateBudgetLineService } from '@/modules/budgets/services/update-budget-line';
import { fakeId, type Db as TestDb } from '~test/factories/base';
import { insertBudgetLine } from '~test/factories/budget-line.factory';
import { insertBudgetPeriodWithUser } from '~test/factories/budget-period-with-user.factory';
import { insertCategory } from '~test/factories/category.factory';
import { insertUser } from '~test/factories/user.factory';
import { test } from '~test/integration-setup';

const asDb = (db: TestDb) => db as unknown as Db;

// ---------------------------------------------------------------------------
// listBudgetLinesService
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// createBudgetLineService
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// updateBudgetLineService
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// deleteBudgetLineService
// ---------------------------------------------------------------------------

test('delete — soft-deletes line', async ({ serviceDb }) => {
  const { period, user } = await insertBudgetPeriodWithUser(serviceDb);
  const category = await insertCategory(serviceDb, { userId: user.id });
  const line = await insertBudgetLine(serviceDb, {
    budgetPeriodId: period.id,
    categoryId: category.id,
  });

  await deleteBudgetLineService(asDb(serviceDb), user.id, { id: line.id });

  const rows = await serviceDb
    .select()
    .from(budgetLines)
    .where(and(eq(budgetLines.id, line.id), notDeleted(budgetLines.deletedAt)));

  expect(rows).toHaveLength(0);
});

test('delete — rejects nonexistent id', async ({ serviceDb }) => {
  const user = await insertUser(serviceDb);

  await expect(
    deleteBudgetLineService(asDb(serviceDb), user.id, { id: fakeId() }),
  ).rejects.toMatchObject({ status: 404 });
});

test('delete — rejects non-owner', async ({ serviceDb }) => {
  const { period, user } = await insertBudgetPeriodWithUser(serviceDb);
  const category = await insertCategory(serviceDb, { userId: user.id });
  const line = await insertBudgetLine(serviceDb, {
    budgetPeriodId: period.id,
    categoryId: category.id,
  });
  const other = await insertUser(serviceDb);

  await expect(
    deleteBudgetLineService(asDb(serviceDb), other.id, { id: line.id }),
  ).rejects.toMatchObject({ status: 404 });
});

test('delete — rejects already-soft-deleted', async ({ serviceDb }) => {
  const { period, user } = await insertBudgetPeriodWithUser(serviceDb);
  const category = await insertCategory(serviceDb, { userId: user.id });
  const line = await insertBudgetLine(serviceDb, {
    budgetPeriodId: period.id,
    categoryId: category.id,
    deletedAt: new Date(),
  });

  await expect(
    deleteBudgetLineService(asDb(serviceDb), user.id, { id: line.id }),
  ).rejects.toMatchObject({ status: 404 });
});

test('delete — writes audit log', async ({ serviceDb }) => {
  const { period, user } = await insertBudgetPeriodWithUser(serviceDb);
  const category = await insertCategory(serviceDb, { userId: user.id });
  const line = await insertBudgetLine(serviceDb, {
    budgetPeriodId: period.id,
    categoryId: category.id,
  });

  await deleteBudgetLineService(asDb(serviceDb), user.id, { id: line.id });

  const logs = await serviceDb
    .select()
    .from(auditLogs)
    .where(
      and(
        eq(auditLogs.recordId, line.id),
        eq(auditLogs.tableName, 'budget_lines'),
        eq(auditLogs.action, 'delete'),
      ),
    );

  expect(logs).toHaveLength(1);
  expect(logs[0].actorId).toBe(user.id);
});
