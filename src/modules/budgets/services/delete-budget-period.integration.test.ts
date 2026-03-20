import { and, eq } from 'drizzle-orm';
import { expect } from 'vitest';

import type { Db } from '@/db';

import { auditLogs } from '@/db/schema';
import { notDeleted } from '@/lib/audit/soft-delete';
import { budgetLines, budgetPeriods } from '@/modules/budgets/db/schema';
import { deleteBudgetPeriodService } from '@/modules/budgets/services/delete-budget-period';
import { fakeId, type Db as TestDb } from '~test/factories/base';
import { insertBudgetLine } from '~test/factories/budget-line.factory';
import { insertBudgetPeriodWithUser } from '~test/factories/budget-period-with-user.factory';
import { insertCategory } from '~test/factories/category.factory';
import { insertUser } from '~test/factories/user.factory';
import { test } from '~test/integration-setup';

const asDb = (db: TestDb) => db as unknown as Db;

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
