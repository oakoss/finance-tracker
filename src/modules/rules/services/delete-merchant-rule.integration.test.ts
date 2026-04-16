import { and, eq } from 'drizzle-orm';
import { expect } from 'vitest';

import type { Db } from '@/db';

import { auditLogs } from '@/db/schema';
import { notDeleted } from '@/lib/audit/soft-delete';
import { merchantRules, ruleRuns } from '@/modules/rules/db/schema';
import { deleteMerchantRuleService } from '@/modules/rules/services/delete-merchant-rule';
import { fakeId, type Db as TestDb } from '~test/factories/base';
import { insertMerchantRuleWithUser } from '~test/factories/merchant-rule-with-user.factory';
import { insertRuleRun } from '~test/factories/rule-run.factory';
import { insertUser } from '~test/factories/user.factory';
import { test } from '~test/integration-setup';

const asDb = (db: TestDb) => db as unknown as Db;

test('delete — soft-deletes rule', async ({ serviceDb }) => {
  const { rule, user } = await insertMerchantRuleWithUser(serviceDb);

  await deleteMerchantRuleService(asDb(serviceDb), user.id, { id: rule.id });

  const active = await serviceDb
    .select()
    .from(merchantRules)
    .where(
      and(eq(merchantRules.id, rule.id), notDeleted(merchantRules.deletedAt)),
    );
  expect(active).toHaveLength(0);

  const [row] = await serviceDb
    .select()
    .from(merchantRules)
    .where(eq(merchantRules.id, rule.id));
  expect(row.deletedAt).not.toBeNull();
  expect(row.deletedById).toBe(user.id);
});

test('delete — rejects nonexistent id', async ({ serviceDb }) => {
  const user = await insertUser(serviceDb);

  await expect(
    deleteMerchantRuleService(asDb(serviceDb), user.id, { id: fakeId() }),
  ).rejects.toMatchObject({ status: 404 });
});

test('delete — rejects non-owner', async ({ serviceDb }) => {
  const { rule } = await insertMerchantRuleWithUser(serviceDb);
  const other = await insertUser(serviceDb);

  await expect(
    deleteMerchantRuleService(asDb(serviceDb), other.id, { id: rule.id }),
  ).rejects.toMatchObject({ status: 404 });
});

test('delete — rejects already-deleted rule', async ({ serviceDb }) => {
  const { rule, user } = await insertMerchantRuleWithUser(serviceDb, {
    rule: { deletedAt: new Date() },
  });

  await expect(
    deleteMerchantRuleService(asDb(serviceDb), user.id, { id: rule.id }),
  ).rejects.toMatchObject({ status: 404 });
});

test('delete — writes audit log with beforeData', async ({ serviceDb }) => {
  const { rule, user } = await insertMerchantRuleWithUser(serviceDb);

  await deleteMerchantRuleService(asDb(serviceDb), user.id, { id: rule.id });

  const logs = await serviceDb
    .select()
    .from(auditLogs)
    .where(
      and(
        eq(auditLogs.recordId, rule.id),
        eq(auditLogs.tableName, 'merchant_rules'),
        eq(auditLogs.action, 'delete'),
      ),
    );

  expect(logs).toHaveLength(1);
  expect(logs[0].beforeData).toMatchObject({ id: rule.id });
  expect(logs[0].afterData).toBeNull();
});

test('delete — soft-delete preserves rule_runs history', async ({
  serviceDb,
}) => {
  const { rule, user } = await insertMerchantRuleWithUser(serviceDb);
  await insertRuleRun(serviceDb, { ruleId: rule.id });

  await deleteMerchantRuleService(asDb(serviceDb), user.id, { id: rule.id });

  const runs = await serviceDb
    .select()
    .from(ruleRuns)
    .where(eq(ruleRuns.ruleId, rule.id));

  expect(runs).toHaveLength(1);
});
