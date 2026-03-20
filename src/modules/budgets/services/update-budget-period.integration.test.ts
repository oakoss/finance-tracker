import { and, eq } from 'drizzle-orm';
import { expect } from 'vitest';

import type { Db } from '@/db';

import { auditLogs } from '@/db/schema';
import { updateBudgetPeriodService } from '@/modules/budgets/services/update-budget-period';
import { fakeId, type Db as TestDb } from '~test/factories/base';
import { insertBudgetPeriodWithUser } from '~test/factories/budget-period-with-user.factory';
import { insertBudgetPeriod } from '~test/factories/budget-period.factory';
import { insertUser } from '~test/factories/user.factory';
import { test } from '~test/integration-setup';

const asDb = (db: TestDb) => db as unknown as Db;

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
