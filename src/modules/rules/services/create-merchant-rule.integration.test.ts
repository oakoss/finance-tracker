import { and, eq } from 'drizzle-orm';
import { expect } from 'vitest';

import type { Db } from '@/db';

import { auditLogs } from '@/db/schema';
import { createMerchantRuleService } from '@/modules/rules/services/create-merchant-rule';
import { expectPgError } from '~test/assertions';
import { fakeId, type Db as TestDb } from '~test/factories/base';
import { insertMerchantRule } from '~test/factories/merchant-rule.factory';
import { insertUser } from '~test/factories/user.factory';
import { test } from '~test/integration-setup';

const asDb = (db: TestDb) => db as unknown as Db;

test('create — inserts with defaults', async ({ serviceDb }) => {
  const user = await insertUser(serviceDb);

  const rule = await createMerchantRuleService(asDb(serviceDb), user.id, {
    actions: [{ categoryId: fakeId(), kind: 'setCategory' }],
    match: { kind: 'contains', value: 'amazon' },
  });

  expect(rule.id).toBeDefined();
  expect(rule.stage).toBe('default');
  expect(rule.priority).toBe(0);
  expect(rule.isActive).toBe(true);
  expect(rule.userId).toBe(user.id);
});

test('create — honors provided stage and isActive', async ({ serviceDb }) => {
  const user = await insertUser(serviceDb);

  const rule = await createMerchantRuleService(asDb(serviceDb), user.id, {
    actions: [{ categoryId: fakeId(), kind: 'setCategory' }],
    isActive: false,
    match: { kind: 'contains', value: 'amazon' },
    stage: 'pre',
  });

  expect(rule.stage).toBe('pre');
  expect(rule.isActive).toBe(false);
});

test('create — computes next priority from MAX (ignores gaps and soft-deletes)', async ({
  serviceDb,
}) => {
  const user = await insertUser(serviceDb);

  // Active rule at priority 5 (leaves gaps at 0-4).
  await insertMerchantRule(serviceDb, {
    priority: 5,
    stage: 'default',
    userId: user.id,
  });
  // Soft-deleted rule at priority 2 — should not influence the
  // computation. A count(*)-based implementation would yield 1 or 2
  // and collide with the existing priority-5 rule later.
  await insertMerchantRule(serviceDb, {
    deletedAt: new Date(),
    priority: 2,
    stage: 'default',
    userId: user.id,
  });

  const rule = await createMerchantRuleService(asDb(serviceDb), user.id, {
    actions: [{ categoryId: fakeId(), kind: 'setCategory' }],
    match: { kind: 'contains', value: 'amazon' },
  });

  expect(rule.priority).toBe(6);
});

test('create — auto-appends priority to end of stage', async ({
  serviceDb,
}) => {
  const user = await insertUser(serviceDb);

  const first = await createMerchantRuleService(asDb(serviceDb), user.id, {
    actions: [{ categoryId: fakeId(), kind: 'setCategory' }],
    match: { kind: 'contains', value: 'amazon' },
  });
  const second = await createMerchantRuleService(asDb(serviceDb), user.id, {
    actions: [{ categoryId: fakeId(), kind: 'setCategory' }],
    match: { kind: 'contains', value: 'starbucks' },
  });
  const third = await createMerchantRuleService(asDb(serviceDb), user.id, {
    actions: [{ categoryId: fakeId(), kind: 'setCategory' }],
    match: { kind: 'contains', value: 'target' },
    stage: 'pre',
  });

  expect(first.priority).toBe(0);
  expect(second.priority).toBe(1);
  expect(third.priority).toBe(0); // separate stage — starts fresh
});

test('create — writes audit log with afterData', async ({ serviceDb }) => {
  const user = await insertUser(serviceDb);

  const rule = await createMerchantRuleService(asDb(serviceDb), user.id, {
    actions: [{ categoryId: fakeId(), kind: 'setCategory' }],
    match: { kind: 'contains', value: 'amazon' },
  });

  const logs = await serviceDb
    .select()
    .from(auditLogs)
    .where(
      and(
        eq(auditLogs.recordId, rule.id),
        eq(auditLogs.tableName, 'merchant_rules'),
      ),
    );

  expect(logs).toHaveLength(1);
  expect(logs[0].action).toBe('create');
  expect(logs[0].actorId).toBe(user.id);
  expect(logs[0].beforeData).toBeNull();
  expect(logs[0].afterData).toMatchObject({ id: rule.id });
});

test('create — rejects empty actions via DB CHECK', async ({ serviceDb }) => {
  const user = await insertUser(serviceDb);

  await expectPgError(
    () =>
      createMerchantRuleService(asDb(serviceDb), user.id, {
        actions: [] as never,
        match: { kind: 'contains', value: 'amazon' },
      }),
    { code: '23514', constraint: 'merchant_rules_actions_nonempty_check' },
  );
});

test('create — isolates by user', async ({ serviceDb }) => {
  const userA = await insertUser(serviceDb);
  const userB = await insertUser(serviceDb);

  await createMerchantRuleService(asDb(serviceDb), userA.id, {
    actions: [{ categoryId: fakeId(), kind: 'setCategory' }],
    match: { kind: 'contains', value: 'amazon' },
  });

  const rulesForB = await serviceDb.query.merchantRules.findMany({
    where: (t, { eq: e }) => e(t.userId, userB.id),
  });

  expect(rulesForB).toHaveLength(0);
});
