import { and, eq } from 'drizzle-orm';
import { expect } from 'vitest';

import type { Db } from '@/db';

import { auditLogs } from '@/db/schema';
import { updateMerchantRuleService } from '@/modules/rules/services/update-merchant-rule';
import { fakeId, type Db as TestDb } from '~test/factories/base';
import { insertMerchantRuleWithUser } from '~test/factories/merchant-rule-with-user.factory';
import { insertMerchantRule } from '~test/factories/merchant-rule.factory';
import { insertUser } from '~test/factories/user.factory';
import { test } from '~test/integration-setup';

const asDb = (db: TestDb) => db as unknown as Db;

test('update — updates match and actions', async ({ serviceDb }) => {
  const { rule, user } = await insertMerchantRuleWithUser(serviceDb);
  const newCategoryId = fakeId();

  const updated = await updateMerchantRuleService(asDb(serviceDb), user.id, {
    actions: [{ categoryId: newCategoryId, kind: 'setCategory' }],
    id: rule.id,
    match: { kind: 'exact', value: 'Starbucks' },
  });

  expect(updated.match).toEqual({ kind: 'exact', value: 'Starbucks' });
  expect(updated.actions).toEqual([
    { categoryId: newCategoryId, kind: 'setCategory' },
  ]);
});

test('update — partial update leaves other fields untouched', async ({
  serviceDb,
}) => {
  const { rule, user } = await insertMerchantRuleWithUser(serviceDb, {
    rule: { isActive: true, priority: 3 },
  });

  const updated = await updateMerchantRuleService(asDb(serviceDb), user.id, {
    id: rule.id,
    isActive: false,
  });

  expect(updated.isActive).toBe(false);
  expect(updated.priority).toBe(3);
  expect(updated.match).toEqual(rule.match);
});

test('update — stage change lands rule at end of destination stage', async ({
  serviceDb,
}) => {
  const { rule, user } = await insertMerchantRuleWithUser(serviceDb, {
    rule: { priority: 0, stage: 'default' },
  });
  await insertMerchantRule(serviceDb, {
    priority: 0,
    stage: 'post',
    userId: user.id,
  });
  await insertMerchantRule(serviceDb, {
    priority: 1,
    stage: 'post',
    userId: user.id,
  });

  const updated = await updateMerchantRuleService(asDb(serviceDb), user.id, {
    id: rule.id,
    stage: 'post',
  });

  expect(updated.stage).toBe('post');
  expect(updated.priority).toBe(2);
});

test('update — rejects nonexistent id', async ({ serviceDb }) => {
  const user = await insertUser(serviceDb);

  await expect(
    updateMerchantRuleService(asDb(serviceDb), user.id, {
      id: fakeId(),
      isActive: false,
    }),
  ).rejects.toMatchObject({ status: 404 });
});

test('update — rejects non-owner', async ({ serviceDb }) => {
  const { rule } = await insertMerchantRuleWithUser(serviceDb);
  const other = await insertUser(serviceDb);

  await expect(
    updateMerchantRuleService(asDb(serviceDb), other.id, {
      id: rule.id,
      isActive: false,
    }),
  ).rejects.toMatchObject({ status: 404 });
});

test('update — rejects soft-deleted rule', async ({ serviceDb }) => {
  const { rule, user } = await insertMerchantRuleWithUser(serviceDb, {
    rule: { deletedAt: new Date() },
  });

  await expect(
    updateMerchantRuleService(asDb(serviceDb), user.id, {
      id: rule.id,
      isActive: false,
    }),
  ).rejects.toMatchObject({ status: 404 });
});

test('update — writes audit log with before/after', async ({ serviceDb }) => {
  const { rule, user } = await insertMerchantRuleWithUser(serviceDb, {
    rule: { isActive: true },
  });

  await updateMerchantRuleService(asDb(serviceDb), user.id, {
    id: rule.id,
    isActive: false,
  });

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
