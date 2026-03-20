import { and, eq } from 'drizzle-orm';
import { expect } from 'vitest';

import type { Db } from '@/db';

import { auditLogs } from '@/db/schema';
import { notDeleted } from '@/lib/audit/soft-delete';
import { budgetLines } from '@/modules/budgets/db/schema';
import { copyBudgetPeriodService } from '@/modules/budgets/services/copy-budget-period';
import { fakeId, type Db as TestDb } from '~test/factories/base';
import { insertBudgetLine } from '~test/factories/budget-line.factory';
import { insertBudgetPeriodWithUser } from '~test/factories/budget-period-with-user.factory';
import { insertCategory } from '~test/factories/category.factory';
import { insertUser } from '~test/factories/user.factory';
import { test } from '~test/integration-setup';

const asDb = (db: TestDb) => db as unknown as Db;

test('copy — creates new period with copied lines', async ({ serviceDb }) => {
  const { period, user } = await insertBudgetPeriodWithUser(serviceDb, {
    period: { month: 1, year: 2025 },
  });
  const cat1 = await insertCategory(serviceDb, { userId: user.id });
  const cat2 = await insertCategory(serviceDb, { userId: user.id });
  await insertBudgetLine(serviceDb, {
    amountCents: 50_000,
    budgetPeriodId: period.id,
    categoryId: cat1.id,
    notes: 'Groceries',
  });
  await insertBudgetLine(serviceDb, {
    amountCents: 20_000,
    budgetPeriodId: period.id,
    categoryId: cat2.id,
  });

  const newPeriod = await copyBudgetPeriodService(asDb(serviceDb), user.id, {
    month: 2,
    sourcePeriodId: period.id,
    year: 2025,
  });

  expect(newPeriod.month).toBe(2);
  expect(newPeriod.year).toBe(2025);
  expect(newPeriod.userId).toBe(user.id);

  const lines = await serviceDb
    .select()
    .from(budgetLines)
    .where(
      and(
        eq(budgetLines.budgetPeriodId, newPeriod.id),
        notDeleted(budgetLines.deletedAt),
      ),
    );

  expect(lines).toHaveLength(2);
  const sorted = lines.toSorted((a, b) => a.amountCents - b.amountCents);
  expect(sorted[0].amountCents).toBe(20_000);
  expect(sorted[0].categoryId).toBe(cat2.id);
  expect(sorted[1].amountCents).toBe(50_000);
  expect(sorted[1].categoryId).toBe(cat1.id);
  expect(sorted[1].notes).toBe('Groceries');
});

test('copy — excludes soft-deleted source lines', async ({ serviceDb }) => {
  const { period, user } = await insertBudgetPeriodWithUser(serviceDb, {
    period: { month: 1, year: 2025 },
  });
  const cat1 = await insertCategory(serviceDb, { userId: user.id });
  const cat2 = await insertCategory(serviceDb, { userId: user.id });
  await insertBudgetLine(serviceDb, {
    budgetPeriodId: period.id,
    categoryId: cat1.id,
    deletedAt: new Date(),
  });
  await insertBudgetLine(serviceDb, {
    amountCents: 30_000,
    budgetPeriodId: period.id,
    categoryId: cat2.id,
  });

  const newPeriod = await copyBudgetPeriodService(asDb(serviceDb), user.id, {
    month: 2,
    sourcePeriodId: period.id,
    year: 2025,
  });

  const lines = await serviceDb
    .select()
    .from(budgetLines)
    .where(
      and(
        eq(budgetLines.budgetPeriodId, newPeriod.id),
        notDeleted(budgetLines.deletedAt),
      ),
    );

  expect(lines).toHaveLength(1);
  expect(lines[0].categoryId).toBe(cat2.id);
});

test('copy — excludes lines with soft-deleted category', async ({
  serviceDb,
}) => {
  const { period, user } = await insertBudgetPeriodWithUser(serviceDb, {
    period: { month: 1, year: 2025 },
  });
  const active = await insertCategory(serviceDb, { userId: user.id });
  const deleted = await insertCategory(serviceDb, {
    deletedAt: new Date(),
    userId: user.id,
  });
  await insertBudgetLine(serviceDb, {
    amountCents: 50_000,
    budgetPeriodId: period.id,
    categoryId: active.id,
  });
  await insertBudgetLine(serviceDb, {
    amountCents: 30_000,
    budgetPeriodId: period.id,
    categoryId: deleted.id,
  });

  const newPeriod = await copyBudgetPeriodService(asDb(serviceDb), user.id, {
    month: 2,
    sourcePeriodId: period.id,
    year: 2025,
  });

  const lines = await serviceDb
    .select()
    .from(budgetLines)
    .where(
      and(
        eq(budgetLines.budgetPeriodId, newPeriod.id),
        notDeleted(budgetLines.deletedAt),
      ),
    );

  expect(lines).toHaveLength(1);
  expect(lines[0].categoryId).toBe(active.id);
});

test('copy — rejects non-owner source period', async ({ serviceDb }) => {
  const { period } = await insertBudgetPeriodWithUser(serviceDb);
  const other = await insertUser(serviceDb);

  await expect(
    copyBudgetPeriodService(asDb(serviceDb), other.id, {
      month: 2,
      sourcePeriodId: period.id,
      year: 2025,
    }),
  ).rejects.toMatchObject({ status: 404 });
});

test('copy — rejects soft-deleted source period', async ({ serviceDb }) => {
  const { period, user } = await insertBudgetPeriodWithUser(serviceDb, {
    period: { deletedAt: new Date(), month: 1, year: 2025 },
  });

  await expect(
    copyBudgetPeriodService(asDb(serviceDb), user.id, {
      month: 2,
      sourcePeriodId: period.id,
      year: 2025,
    }),
  ).rejects.toMatchObject({ status: 404 });
});

test('copy — rejects nonexistent source period', async ({ serviceDb }) => {
  const user = await insertUser(serviceDb);

  await expect(
    copyBudgetPeriodService(asDb(serviceDb), user.id, {
      month: 2,
      sourcePeriodId: fakeId(),
      year: 2025,
    }),
  ).rejects.toMatchObject({ status: 404 });
});

test('copy — rejects duplicate target month', async ({ serviceDb }) => {
  const { period, user } = await insertBudgetPeriodWithUser(serviceDb, {
    period: { month: 1, year: 2025 },
  });

  await expect(
    copyBudgetPeriodService(asDb(serviceDb), user.id, {
      month: 1,
      sourcePeriodId: period.id,
      year: 2025,
    }),
  ).rejects.toThrow();
});

test('copy — writes audit logs for period and lines', async ({ serviceDb }) => {
  const { period, user } = await insertBudgetPeriodWithUser(serviceDb, {
    period: { month: 1, year: 2025 },
  });
  const category = await insertCategory(serviceDb, { userId: user.id });
  await insertBudgetLine(serviceDb, {
    budgetPeriodId: period.id,
    categoryId: category.id,
  });

  const newPeriod = await copyBudgetPeriodService(asDb(serviceDb), user.id, {
    month: 2,
    sourcePeriodId: period.id,
    year: 2025,
  });

  const periodLogs = await serviceDb
    .select()
    .from(auditLogs)
    .where(
      and(
        eq(auditLogs.recordId, newPeriod.id),
        eq(auditLogs.tableName, 'budget_periods'),
        eq(auditLogs.action, 'create'),
      ),
    );

  expect(periodLogs).toHaveLength(1);
  expect(periodLogs[0].actorId).toBe(user.id);

  const lineLogs = await serviceDb
    .select()
    .from(auditLogs)
    .where(
      and(
        eq(auditLogs.tableName, 'budget_lines'),
        eq(auditLogs.action, 'create'),
        eq(auditLogs.actorId, user.id),
      ),
    );

  // At least 1 audit log for the copied line (may have others from setup)
  expect(lineLogs.length).toBeGreaterThanOrEqual(1);
});

test('copy — handles empty source period', async ({ serviceDb }) => {
  const { period, user } = await insertBudgetPeriodWithUser(serviceDb, {
    period: { month: 1, year: 2025 },
  });

  const newPeriod = await copyBudgetPeriodService(asDb(serviceDb), user.id, {
    month: 2,
    sourcePeriodId: period.id,
    year: 2025,
  });

  expect(newPeriod.month).toBe(2);

  const lines = await serviceDb
    .select()
    .from(budgetLines)
    .where(eq(budgetLines.budgetPeriodId, newPeriod.id));

  expect(lines).toHaveLength(0);
});
