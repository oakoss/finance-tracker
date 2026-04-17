import { eq } from 'drizzle-orm';
import { expect } from 'vitest';

import type { Db } from '@/db';

import { merchantRules } from '@/modules/rules/db/schema';
import { listMerchantRulesService } from '@/modules/rules/services/list-merchant-rules';
import type { Db as TestDb } from '~test/factories/base';
import { insertMerchantRuleWithUser } from '~test/factories/merchant-rule-with-user.factory';
import { insertMerchantRule } from '~test/factories/merchant-rule.factory';
import { insertUser } from '~test/factories/user.factory';
import { test } from '~test/integration-setup';

const asDb = (db: TestDb) => db as unknown as Db;

test('list — returns rules ordered by (stage, priority)', async ({
  serviceDb,
}) => {
  const user = await insertUser(serviceDb);

  await insertMerchantRule(serviceDb, {
    priority: 0,
    stage: 'post',
    userId: user.id,
  });
  await insertMerchantRule(serviceDb, {
    priority: 1,
    stage: 'default',
    userId: user.id,
  });
  await insertMerchantRule(serviceDb, {
    priority: 0,
    stage: 'pre',
    userId: user.id,
  });
  await insertMerchantRule(serviceDb, {
    priority: 0,
    stage: 'default',
    userId: user.id,
  });

  const rules = await listMerchantRulesService(asDb(serviceDb), user.id);

  expect(rules.map((r) => [r.stage, r.priority])).toStrictEqual([
    ['pre', 0],
    ['default', 0],
    ['default', 1],
    ['post', 0],
  ]);
});

test('list — hides soft-deleted rules', async ({ serviceDb }) => {
  const { user } = await insertMerchantRuleWithUser(serviceDb, {
    rule: { deletedAt: new Date() },
  });
  await insertMerchantRule(serviceDb, { userId: user.id });

  const rules = await listMerchantRulesService(asDb(serviceDb), user.id);

  expect(rules).toHaveLength(1);
  expect(rules[0].deletedAt).toBeNull();
});

test('list — isolates rules by user', async ({ serviceDb }) => {
  const { user: userA } = await insertMerchantRuleWithUser(serviceDb);
  const { user: userB } = await insertMerchantRuleWithUser(serviceDb);

  const rulesA = await listMerchantRulesService(asDb(serviceDb), userA.id);
  const rulesB = await listMerchantRulesService(asDb(serviceDb), userB.id);

  expect(rulesA).toHaveLength(1);
  expect(rulesB).toHaveLength(1);
  expect(rulesA[0].userId).toBe(userA.id);
  expect(rulesB[0].userId).toBe(userB.id);
});

test('list — returns empty array when user has no rules', async ({
  serviceDb,
}) => {
  const user = await insertUser(serviceDb);

  const rules = await listMerchantRulesService(asDb(serviceDb), user.id);

  expect(rules).toStrictEqual([]);
});

test('list — throws 500 when a row has a corrupt match predicate', async ({
  serviceDb,
}) => {
  const { rule, user } = await insertMerchantRuleWithUser(serviceDb);

  // Bypass ArkType validation by writing directly to the JSONB column.
  await serviceDb
    .update(merchantRules)
    .set({ match: { bogus: true } as never })
    .where(eq(merchantRules.id, rule.id));

  await expect(
    listMerchantRulesService(asDb(serviceDb), user.id),
  ).rejects.toMatchObject({ status: 500 });
});

test('list — throws 500 when a row has a corrupt actions array', async ({
  serviceDb,
}) => {
  const { rule, user } = await insertMerchantRuleWithUser(serviceDb);

  await serviceDb
    .update(merchantRules)
    .set({ actions: [{ kind: 'unknownKind' }] as never })
    .where(eq(merchantRules.id, rule.id));

  await expect(
    listMerchantRulesService(asDb(serviceDb), user.id),
  ).rejects.toMatchObject({ status: 500 });
});
