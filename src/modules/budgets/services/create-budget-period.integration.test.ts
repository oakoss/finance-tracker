import { and, eq } from 'drizzle-orm';
import { expect } from 'vitest';

import type { Db } from '@/db';

import { auditLogs } from '@/db/schema';
import { createBudgetPeriodService } from '@/modules/budgets/services/create-budget-period';
import type { Db as TestDb } from '~test/factories/base';
import { insertBudgetPeriodWithUser } from '~test/factories/budget-period-with-user.factory';
import { insertUser } from '~test/factories/user.factory';
import { test } from '~test/integration-setup';

const asDb = (db: TestDb) => db as unknown as Db;

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
