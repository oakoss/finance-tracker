import { and, eq } from 'drizzle-orm';
import { expect } from 'vitest';

import type { Db } from '@/db';

import { auditLogs } from '@/db/schema';
import { merchantRules } from '@/modules/rules/db/schema';
import { reorderMerchantRulesService } from '@/modules/rules/services/reorder-merchant-rules';
import { fakeId, type Db as TestDb } from '~test/factories/base';
import { insertMerchantRule } from '~test/factories/merchant-rule.factory';
import { insertUser } from '~test/factories/user.factory';
import { test } from '~test/integration-setup';

const asDb = (db: TestDb) => db as unknown as Db;

async function seedRulesInStage(serviceDb: TestDb, userId: string, count: 3) {
  const rules = await Promise.all(
    Array.from({ length: count }, (_, i) =>
      insertMerchantRule(serviceDb, { priority: i, stage: 'default', userId }),
    ),
  );
  return rules;
}

test('reorder — assigns dense priorities 0..N-1', async ({ serviceDb }) => {
  const user = await insertUser(serviceDb);
  const [a, b, c] = await seedRulesInStage(serviceDb, user.id, 3);

  await reorderMerchantRulesService(asDb(serviceDb), user.id, {
    orderedIds: [c.id, a.id, b.id],
    stage: 'default',
  });

  const rows = await serviceDb
    .select({ id: merchantRules.id, priority: merchantRules.priority })
    .from(merchantRules)
    .where(
      and(
        eq(merchantRules.userId, user.id),
        eq(merchantRules.stage, 'default'),
      ),
    );
  const byId = new Map(rows.map((r) => [r.id, r.priority]));

  expect(byId.get(c.id)).toBe(0);
  expect(byId.get(a.id)).toBe(1);
  expect(byId.get(b.id)).toBe(2);
});

test('reorder — 422 when orderedIds is missing a rule', async ({
  serviceDb,
}) => {
  const user = await insertUser(serviceDb);
  const [a, b] = await seedRulesInStage(serviceDb, user.id, 3);

  await expect(
    reorderMerchantRulesService(asDb(serviceDb), user.id, {
      orderedIds: [a.id, b.id],
      stage: 'default',
    }),
  ).rejects.toMatchObject({ status: 422 });
});

test('reorder — 422 when orderedIds has an extra id', async ({ serviceDb }) => {
  const user = await insertUser(serviceDb);
  const [a, b, c] = await seedRulesInStage(serviceDb, user.id, 3);

  await expect(
    reorderMerchantRulesService(asDb(serviceDb), user.id, {
      orderedIds: [a.id, b.id, c.id, fakeId()],
      stage: 'default',
    }),
  ).rejects.toMatchObject({ status: 422 });
});

test('reorder — 422 when orderedIds references a different stage', async ({
  serviceDb,
}) => {
  const user = await insertUser(serviceDb);
  const defaultRule = await insertMerchantRule(serviceDb, {
    stage: 'default',
    userId: user.id,
  });
  const postRule = await insertMerchantRule(serviceDb, {
    stage: 'post',
    userId: user.id,
  });

  await expect(
    reorderMerchantRulesService(asDb(serviceDb), user.id, {
      orderedIds: [defaultRule.id, postRule.id],
      stage: 'default',
    }),
  ).rejects.toMatchObject({ status: 422 });
});

test('reorder — ignores soft-deleted rules', async ({ serviceDb }) => {
  const user = await insertUser(serviceDb);
  const active = await insertMerchantRule(serviceDb, {
    stage: 'default',
    userId: user.id,
  });
  await insertMerchantRule(serviceDb, {
    deletedAt: new Date(),
    stage: 'default',
    userId: user.id,
  });

  await reorderMerchantRulesService(asDb(serviceDb), user.id, {
    orderedIds: [active.id],
    stage: 'default',
  });

  const [row] = await serviceDb
    .select()
    .from(merchantRules)
    .where(eq(merchantRules.id, active.id));
  expect(row.priority).toBe(0);
});

test('reorder — only audits rules whose priority actually changed', async ({
  serviceDb,
}) => {
  const user = await insertUser(serviceDb);
  const [a, b, c] = await seedRulesInStage(serviceDb, user.id, 3);

  // Only swap b and c; a stays at 0.
  await reorderMerchantRulesService(asDb(serviceDb), user.id, {
    orderedIds: [a.id, c.id, b.id],
    stage: 'default',
  });

  const changedIds = new Set([b.id, c.id]);
  for (const id of changedIds) {
    const logs = await serviceDb
      .select()
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.recordId, id),
          eq(auditLogs.tableName, 'merchant_rules'),
          eq(auditLogs.action, 'update'),
        ),
      );
    expect(logs).toHaveLength(1);
  }

  const aLogs = await serviceDb
    .select()
    .from(auditLogs)
    .where(
      and(
        eq(auditLogs.recordId, a.id),
        eq(auditLogs.tableName, 'merchant_rules'),
      ),
    );
  expect(aLogs).toHaveLength(0);
});

test('reorder — does not leak across users', async ({ serviceDb }) => {
  const userA = await insertUser(serviceDb);
  const userB = await insertUser(serviceDb);
  const ruleA = await insertMerchantRule(serviceDb, {
    stage: 'default',
    userId: userA.id,
  });
  const ruleB = await insertMerchantRule(serviceDb, {
    stage: 'default',
    userId: userB.id,
  });

  await expect(
    reorderMerchantRulesService(asDb(serviceDb), userA.id, {
      orderedIds: [ruleA.id, ruleB.id],
      stage: 'default',
    }),
  ).rejects.toMatchObject({ status: 422 });
});
