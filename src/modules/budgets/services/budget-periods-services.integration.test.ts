import { and, eq } from 'drizzle-orm';
import { expect } from 'vitest';

import type { Db } from '@/db';

import { auditLogs } from '@/db/schema';
import { notDeleted } from '@/lib/audit/soft-delete';
import { budgetLines, budgetPeriods } from '@/modules/budgets/db/schema';
import { createBudgetPeriodService } from '@/modules/budgets/services/create-budget-period';
import { deleteBudgetPeriodService } from '@/modules/budgets/services/delete-budget-period';
import { listBudgetPeriodsService } from '@/modules/budgets/services/list-budget-periods';
import { updateBudgetPeriodService } from '@/modules/budgets/services/update-budget-period';
import { fakeId, type Db as TestDb } from '~test/factories/base';
import { insertBudgetLine } from '~test/factories/budget-line.factory';
import { insertBudgetPeriodWithUser } from '~test/factories/budget-period-with-user.factory';
import { insertBudgetPeriod } from '~test/factories/budget-period.factory';
import { insertCategory } from '~test/factories/category.factory';
import { insertUser } from '~test/factories/user.factory';
import { test } from '~test/integration-setup';

const asDb = (db: TestDb) => db as unknown as Db;

// ---------------------------------------------------------------------------
// listBudgetPeriodsService
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// createBudgetPeriodService
// ---------------------------------------------------------------------------

test('create — inserts with required fields', async ({ serviceDb }) => {
  const user = await insertUser(serviceDb);

  const result = await createBudgetPeriodService(asDb(serviceDb), user.id, {
    month: 6,
    year: 2025,
  });

  expect(result.id).toBeDefined();
  expect(result.year).toBe(2025);
  expect(result.month).toBe(6);
  expect(result.notes).toBeNull();
  expect(result.userId).toBe(user.id);
});

test('create — inserts with notes', async ({ serviceDb }) => {
  const user = await insertUser(serviceDb);

  const result = await createBudgetPeriodService(asDb(serviceDb), user.id, {
    month: 1,
    notes: 'January budget',
    year: 2025,
  });

  expect(result.notes).toBe('January budget');
});

test('create — rejects duplicate year/month for same user', async ({
  serviceDb,
}) => {
  const { user } = await insertBudgetPeriodWithUser(serviceDb, {
    period: { month: 6, year: 2025 },
  });

  await expect(
    createBudgetPeriodService(asDb(serviceDb), user.id, {
      month: 6,
      year: 2025,
    }),
  ).rejects.toThrow();
});

test('create — allows same year/month for different users', async ({
  serviceDb,
}) => {
  await insertBudgetPeriodWithUser(serviceDb, {
    period: { month: 6, year: 2025 },
  });
  const user2 = await insertUser(serviceDb);

  const result = await createBudgetPeriodService(asDb(serviceDb), user2.id, {
    month: 6,
    year: 2025,
  });

  expect(result.id).toBeDefined();
});

test('create — writes audit log', async ({ serviceDb }) => {
  const user = await insertUser(serviceDb);

  const result = await createBudgetPeriodService(asDb(serviceDb), user.id, {
    month: 6,
    year: 2025,
  });

  const logs = await serviceDb
    .select()
    .from(auditLogs)
    .where(
      and(
        eq(auditLogs.recordId, result.id),
        eq(auditLogs.tableName, 'budget_periods'),
        eq(auditLogs.action, 'create'),
      ),
    );

  expect(logs).toHaveLength(1);
  expect(logs[0].actorId).toBe(user.id);
});

// ---------------------------------------------------------------------------
// updateBudgetPeriodService
// ---------------------------------------------------------------------------

test('update — updates fields', async ({ serviceDb }) => {
  const { period, user } = await insertBudgetPeriodWithUser(serviceDb, {
    period: { month: 1, notes: null, year: 2025 },
  });

  const updated = await updateBudgetPeriodService(asDb(serviceDb), user.id, {
    id: period.id,
    notes: 'Updated notes',
  });

  expect(updated.notes).toBe('Updated notes');
});

test('update — clears notes with null', async ({ serviceDb }) => {
  const { period, user } = await insertBudgetPeriodWithUser(serviceDb, {
    period: { notes: 'Some notes' },
  });

  const updated = await updateBudgetPeriodService(asDb(serviceDb), user.id, {
    id: period.id,
    notes: null,
  });

  expect(updated.notes).toBeNull();
});

test('update — rejects nonexistent id', async ({ serviceDb }) => {
  const user = await insertUser(serviceDb);

  await expect(
    updateBudgetPeriodService(asDb(serviceDb), user.id, {
      id: fakeId(),
      notes: 'Ghost',
    }),
  ).rejects.toMatchObject({ status: 404 });
});

test('update — rejects non-owner', async ({ serviceDb }) => {
  const { period } = await insertBudgetPeriodWithUser(serviceDb);
  const other = await insertUser(serviceDb);

  await expect(
    updateBudgetPeriodService(asDb(serviceDb), other.id, {
      id: period.id,
      notes: 'Hacked',
    }),
  ).rejects.toMatchObject({ status: 404 });
});

test('update — rejects soft-deleted period', async ({ serviceDb }) => {
  const { period, user } = await insertBudgetPeriodWithUser(serviceDb, {
    period: { deletedAt: new Date() },
  });

  await expect(
    updateBudgetPeriodService(asDb(serviceDb), user.id, {
      id: period.id,
      notes: 'Ghost',
    }),
  ).rejects.toMatchObject({ status: 404 });
});

test('update — rejects duplicate year/month for same user', async ({
  serviceDb,
}) => {
  const { user } = await insertBudgetPeriodWithUser(serviceDb, {
    period: { month: 6, year: 2025 },
  });
  const second = await insertBudgetPeriod(serviceDb, {
    month: 7,
    userId: user.id,
    year: 2025,
  });

  await expect(
    updateBudgetPeriodService(asDb(serviceDb), user.id, {
      id: second.id,
      month: 6,
    }),
  ).rejects.toThrow();
});

test('update — writes audit log with before/after', async ({ serviceDb }) => {
  const { period, user } = await insertBudgetPeriodWithUser(serviceDb);

  await updateBudgetPeriodService(asDb(serviceDb), user.id, {
    id: period.id,
    notes: 'Updated',
  });

  const logs = await serviceDb
    .select()
    .from(auditLogs)
    .where(
      and(
        eq(auditLogs.recordId, period.id),
        eq(auditLogs.tableName, 'budget_periods'),
        eq(auditLogs.action, 'update'),
      ),
    );

  expect(logs).toHaveLength(1);
  expect(logs[0].actorId).toBe(user.id);
});

// ---------------------------------------------------------------------------
// deleteBudgetPeriodService
// ---------------------------------------------------------------------------

test('delete — soft-deletes period', async ({ serviceDb }) => {
  const { period, user } = await insertBudgetPeriodWithUser(serviceDb);

  await deleteBudgetPeriodService(asDb(serviceDb), user.id, { id: period.id });

  const rows = await serviceDb
    .select()
    .from(budgetPeriods)
    .where(
      and(eq(budgetPeriods.id, period.id), notDeleted(budgetPeriods.deletedAt)),
    );

  expect(rows).toHaveLength(0);
});

test('delete — cascade soft-deletes budget lines', async ({ serviceDb }) => {
  const { period, user } = await insertBudgetPeriodWithUser(serviceDb);
  const category = await insertCategory(serviceDb, { userId: user.id });
  await insertBudgetLine(serviceDb, {
    budgetPeriodId: period.id,
    categoryId: category.id,
  });

  await deleteBudgetPeriodService(asDb(serviceDb), user.id, { id: period.id });

  const lines = await serviceDb
    .select()
    .from(budgetLines)
    .where(eq(budgetLines.budgetPeriodId, period.id));

  expect(lines).toHaveLength(1);
  expect(lines[0].deletedAt).toBeInstanceOf(Date);
});

test('delete — rejects nonexistent id', async ({ serviceDb }) => {
  const user = await insertUser(serviceDb);

  await expect(
    deleteBudgetPeriodService(asDb(serviceDb), user.id, { id: fakeId() }),
  ).rejects.toMatchObject({ status: 404 });
});

test('delete — rejects non-owner', async ({ serviceDb }) => {
  const { period } = await insertBudgetPeriodWithUser(serviceDb);
  const other = await insertUser(serviceDb);

  await expect(
    deleteBudgetPeriodService(asDb(serviceDb), other.id, { id: period.id }),
  ).rejects.toMatchObject({ status: 404 });
});

test('delete — rejects already-soft-deleted', async ({ serviceDb }) => {
  const { period, user } = await insertBudgetPeriodWithUser(serviceDb, {
    period: { deletedAt: new Date() },
  });

  await expect(
    deleteBudgetPeriodService(asDb(serviceDb), user.id, { id: period.id }),
  ).rejects.toMatchObject({ status: 404 });
});

test('delete — writes audit log', async ({ serviceDb }) => {
  const { period, user } = await insertBudgetPeriodWithUser(serviceDb);

  await deleteBudgetPeriodService(asDb(serviceDb), user.id, { id: period.id });

  const logs = await serviceDb
    .select()
    .from(auditLogs)
    .where(
      and(
        eq(auditLogs.recordId, period.id),
        eq(auditLogs.tableName, 'budget_periods'),
        eq(auditLogs.action, 'delete'),
      ),
    );

  expect(logs).toHaveLength(1);
  expect(logs[0].actorId).toBe(user.id);
});
