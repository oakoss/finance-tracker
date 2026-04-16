import { eq } from 'drizzle-orm';
import { expect } from 'vitest';

import { merchantRules, ruleRuns } from '@/modules/rules/db/schema';
import { expectPgError } from '~test/assertions';
import { fakeId } from '~test/factories/base';
import { insertMerchantRuleWithUser } from '~test/factories/merchant-rule-with-user.factory';
import { insertRuleRun } from '~test/factories/rule-run.factory';
import { test } from '~test/integration-setup';

// ---------------------------------------------------------------------------
// DB constraint tests — merchant_rules
// ---------------------------------------------------------------------------

test('merchant_rules — rejects empty actions via CHECK', async ({ db }) => {
  const { user } = await insertMerchantRuleWithUser(db);

  await expectPgError(
    () =>
      db
        .insert(merchantRules)
        .values({
          actions: [] as never,
          match: { kind: 'contains', value: 'x' },
          userId: user.id,
        }),
    { code: '23514', constraint: 'merchant_rules_actions_nonempty_check' },
  );
});

// ---------------------------------------------------------------------------
// DB constraint tests — rule_runs
// ---------------------------------------------------------------------------

test('rule_runs — rejects undoData with non-array transactions via CHECK', async ({
  db,
}) => {
  const { rule } = await insertMerchantRuleWithUser(db);

  await expectPgError(
    () =>
      db
        .insert(ruleRuns)
        .values({
          ruleId: rule.id,
          undoData: { transactions: 'not-an-array' } as never,
        }),
    { code: '23514', constraint: 'rule_runs_undo_data_shape_check' },
  );
});

test('rule_runs — rejects undoData missing transactions key via CHECK', async ({
  db,
}) => {
  const { rule } = await insertMerchantRuleWithUser(db);

  await expectPgError(
    () =>
      db.insert(ruleRuns).values({ ruleId: rule.id, undoData: {} as never }),
    { code: '23514', constraint: 'rule_runs_undo_data_shape_check' },
  );
});

test('rule_runs — rejects undoData that is an array at the top level', async ({
  db,
}) => {
  const { rule } = await insertMerchantRuleWithUser(db);

  await expectPgError(
    () =>
      db.insert(ruleRuns).values({ ruleId: rule.id, undoData: [] as never }),
    { code: '23514', constraint: 'rule_runs_undo_data_shape_check' },
  );
});

test('rule_runs — accepts empty transactions array', async ({ db }) => {
  const { rule } = await insertMerchantRuleWithUser(db);

  const row = await insertRuleRun(db, {
    ruleId: rule.id,
    undoData: { transactions: [] },
  });

  expect(row.id).toBeDefined();
});

test('rule_runs — FK to merchant_rules cascades on hard delete', async ({
  db,
}) => {
  const { rule } = await insertMerchantRuleWithUser(db);
  await insertRuleRun(db, { ruleId: rule.id });

  await db.delete(merchantRules).where(eq(merchantRules.id, rule.id));

  const remaining = await db
    .select()
    .from(ruleRuns)
    .where(eq(ruleRuns.ruleId, rule.id));

  expect(remaining).toHaveLength(0);
});

test('rule_runs — rejects insert with nonexistent rule_id', async ({ db }) => {
  await expectPgError(
    () =>
      db
        .insert(ruleRuns)
        .values({ ruleId: fakeId(), undoData: { transactions: [] } }),
    { code: '23503', constraint: 'rule_runs_rule_id_merchant_rules_id_fk' },
  );
});

test('rule_runs — undoableUntil defaults to runAt + 5 minutes', async ({
  db,
}) => {
  const { rule } = await insertMerchantRuleWithUser(db);

  const row = await insertRuleRun(db, {
    ruleId: rule.id,
    undoData: { transactions: [] },
  });

  const delta = row.undoableUntil.getTime() - row.runAt.getTime();
  expect(delta).toBeGreaterThanOrEqual(4 * 60 * 1000);
  expect(delta).toBeLessThanOrEqual(6 * 60 * 1000);
});
