import { and, eq } from 'drizzle-orm';
import { expect } from 'vitest';

import type { Db } from '@/db';

import { auditLogs } from '@/db/schema';
import { toggleMerchantRuleService } from '@/modules/rules/services/toggle-merchant-rule';
import { fakeId, type Db as TestDb } from '~test/factories/base';
import { insertMerchantRuleWithUser } from '~test/factories/merchant-rule-with-user.factory';
import { insertUser } from '~test/factories/user.factory';
import { test } from '~test/integration-setup';

const asDb = (db: TestDb) => db as unknown as Db;

test('toggle — flips isActive true → false', async ({ serviceDb }) => {
  const { rule, user } = await insertMerchantRuleWithUser(serviceDb, {
    rule: { isActive: true },
  });

  const updated = await toggleMerchantRuleService(asDb(serviceDb), user.id, {
    id: rule.id,
  });

  expect(updated.isActive).toBe(false);
});

test('toggle — flips isActive false → true', async ({ serviceDb }) => {
  const { rule, user } = await insertMerchantRuleWithUser(serviceDb, {
    rule: { isActive: false },
  });

  const updated = await toggleMerchantRuleService(asDb(serviceDb), user.id, {
    id: rule.id,
  });

  expect(updated.isActive).toBe(true);
});

test('toggle — rejects nonexistent id', async ({ serviceDb }) => {
  const user = await insertUser(serviceDb);

  await expect(
    toggleMerchantRuleService(asDb(serviceDb), user.id, { id: fakeId() }),
  ).rejects.toMatchObject({ status: 404 });
});

test('toggle — rejects non-owner', async ({ serviceDb }) => {
  const { rule } = await insertMerchantRuleWithUser(serviceDb);
  const other = await insertUser(serviceDb);

  await expect(
    toggleMerchantRuleService(asDb(serviceDb), other.id, { id: rule.id }),
  ).rejects.toMatchObject({ status: 404 });
});

test('toggle — writes audit log with before/after', async ({ serviceDb }) => {
  const { rule, user } = await insertMerchantRuleWithUser(serviceDb, {
    rule: { isActive: true },
  });

  await toggleMerchantRuleService(asDb(serviceDb), user.id, { id: rule.id });

  const logs = await serviceDb
    .select()
    .from(auditLogs)
    .where(
      and(
        eq(auditLogs.recordId, rule.id),
        eq(auditLogs.tableName, 'merchant_rules'),
        eq(auditLogs.action, 'update'),
      ),
    );

  expect(logs).toHaveLength(1);
  expect(logs[0].beforeData).toMatchObject({ isActive: true });
  expect(logs[0].afterData).toMatchObject({ isActive: false });
});
