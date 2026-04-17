import { and, eq, inArray } from 'drizzle-orm';
import { expect } from 'vitest';

import type { Db } from '@/db';

import { auditLogs } from '@/db/schema';
import { ruleRuns } from '@/modules/rules/db/schema';
import { applyMerchantRuleService } from '@/modules/rules/services/apply-merchant-rule';
import { undoRuleRunService } from '@/modules/rules/services/undo-rule-run';
import {
  transactions,
  transactionTags,
} from '@/modules/transactions/db/schema';
import { fakeId, type Db as TestDb } from '~test/factories/base';
import { insertCategory } from '~test/factories/category.factory';
import { insertLedgerAccount } from '~test/factories/ledger-account.factory';
import { insertMerchantRule } from '~test/factories/merchant-rule.factory';
import { insertPayee } from '~test/factories/payee.factory';
import { insertRuleRun } from '~test/factories/rule-run.factory';
import { insertTag } from '~test/factories/tag.factory';
import { insertTransaction } from '~test/factories/transaction.factory';
import { insertUser } from '~test/factories/user.factory';
import { test } from '~test/integration-setup';

const asDb = (db: TestDb) => db as unknown as Db;

async function setup(db: TestDb) {
  const user = await insertUser(db);
  const account = await insertLedgerAccount(db, { userId: user.id });
  return { account, user };
}

test('undo — restores categoryId from before.categoryId', async ({
  serviceDb,
}) => {
  const { account, user } = await setup(serviceDb);
  const oldCategory = await insertCategory(serviceDb, { userId: user.id });
  const newCategory = await insertCategory(serviceDb, { userId: user.id });
  const tx = await insertTransaction(serviceDb, {
    accountId: account.id,
    categoryId: oldCategory.id,
    description: 'x',
  });

  const rule = await insertMerchantRule(serviceDb, {
    actions: [{ categoryId: newCategory.id, kind: 'setCategory' }],
    match: { kind: 'contains', value: 'x' },
    userId: user.id,
  });
  const applyResult = await applyMerchantRuleService(asDb(serviceDb), user.id, {
    id: rule.id,
  });

  const result = await undoRuleRunService(asDb(serviceDb), user.id, {
    runId: applyResult.runId,
  });

  expect(result.restoredCount).toBe(1);
  const [after] = await serviceDb
    .select()
    .from(transactions)
    .where(eq(transactions.id, tx.id));
  expect(after.categoryId).toBe(oldCategory.id);

  const [run] = await serviceDb
    .select()
    .from(ruleRuns)
    .where(eq(ruleRuns.id, applyResult.runId));
  expect(run.undoneAt).not.toBeNull();
});

test('undo — restores payeeId and memo (from before.note)', async ({
  serviceDb,
}) => {
  const { account, user } = await setup(serviceDb);
  const oldPayee = await insertPayee(serviceDb, { userId: user.id });
  const newPayee = await insertPayee(serviceDb, { userId: user.id });
  const tx = await insertTransaction(serviceDb, {
    accountId: account.id,
    description: 'x',
    memo: 'original',
    payeeId: oldPayee.id,
  });

  const rule = await insertMerchantRule(serviceDb, {
    actions: [
      { kind: 'setPayee', payeeId: newPayee.id },
      { kind: 'setNote', value: 'overwritten' },
    ],
    match: { kind: 'contains', value: 'x' },
    userId: user.id,
  });
  const applyResult = await applyMerchantRuleService(asDb(serviceDb), user.id, {
    id: rule.id,
  });

  await undoRuleRunService(asDb(serviceDb), user.id, {
    runId: applyResult.runId,
  });

  const [after] = await serviceDb
    .select()
    .from(transactions)
    .where(eq(transactions.id, tx.id));
  expect(after.payeeId).toBe(oldPayee.id);
  expect(after.memo).toBe('original');
});

test('undo — re-inserts tagsRemoved (setTags replace)', async ({
  serviceDb,
}) => {
  const { account, user } = await setup(serviceDb);
  const tagOld = await insertTag(serviceDb, { userId: user.id });
  const tagNew = await insertTag(serviceDb, { userId: user.id });
  const tx = await insertTransaction(serviceDb, {
    accountId: account.id,
    description: 'x',
  });
  await serviceDb
    .insert(transactionTags)
    .values({ createdById: user.id, tagId: tagOld.id, transactionId: tx.id });

  const rule = await insertMerchantRule(serviceDb, {
    actions: [{ kind: 'setTags', mode: 'replace', tagIds: [tagNew.id] }],
    match: { kind: 'contains', value: 'x' },
    userId: user.id,
  });
  const applyResult = await applyMerchantRuleService(asDb(serviceDb), user.id, {
    id: rule.id,
  });

  await undoRuleRunService(asDb(serviceDb), user.id, {
    runId: applyResult.runId,
  });

  const after = await serviceDb
    .select()
    .from(transactionTags)
    .where(eq(transactionTags.transactionId, tx.id));
  expect(after.map((row) => row.tagId)).toStrictEqual([tagOld.id]);
});

test('undo — removes tagsAdded (setTags append)', async ({ serviceDb }) => {
  const { account, user } = await setup(serviceDb);
  const tagA = await insertTag(serviceDb, { userId: user.id });
  const tx = await insertTransaction(serviceDb, {
    accountId: account.id,
    description: 'x',
  });

  const rule = await insertMerchantRule(serviceDb, {
    actions: [{ kind: 'setTags', mode: 'append', tagIds: [tagA.id] }],
    match: { kind: 'contains', value: 'x' },
    userId: user.id,
  });
  const applyResult = await applyMerchantRuleService(asDb(serviceDb), user.id, {
    id: rule.id,
  });

  await undoRuleRunService(asDb(serviceDb), user.id, {
    runId: applyResult.runId,
  });

  const after = await serviceDb
    .select()
    .from(transactionTags)
    .where(eq(transactionTags.transactionId, tx.id));
  expect(after).toHaveLength(0);
});

test('undo — marks run as undone and writes audit log', async ({
  serviceDb,
}) => {
  const { account, user } = await setup(serviceDb);
  const category = await insertCategory(serviceDb, { userId: user.id });
  await insertTransaction(serviceDb, {
    accountId: account.id,
    description: 'x',
  });
  const rule = await insertMerchantRule(serviceDb, {
    actions: [{ categoryId: category.id, kind: 'setCategory' }],
    match: { kind: 'contains', value: 'x' },
    userId: user.id,
  });
  const applyResult = await applyMerchantRuleService(asDb(serviceDb), user.id, {
    id: rule.id,
  });

  await undoRuleRunService(asDb(serviceDb), user.id, {
    runId: applyResult.runId,
  });

  const [run] = await serviceDb
    .select()
    .from(ruleRuns)
    .where(eq(ruleRuns.id, applyResult.runId));
  expect(run.undoneAt).not.toBeNull();
  expect(run.updatedById).toBe(user.id);

  const logs = await serviceDb
    .select()
    .from(auditLogs)
    .where(
      and(
        eq(auditLogs.recordId, applyResult.runId),
        eq(auditLogs.tableName, 'rule_runs'),
        eq(auditLogs.action, 'update'),
      ),
    );
  expect(logs).toHaveLength(1);
});

test('undo — rejects when run already undone (409)', async ({ serviceDb }) => {
  const { account, user } = await setup(serviceDb);
  const category = await insertCategory(serviceDb, { userId: user.id });
  await insertTransaction(serviceDb, {
    accountId: account.id,
    description: 'x',
  });
  const rule = await insertMerchantRule(serviceDb, {
    actions: [{ categoryId: category.id, kind: 'setCategory' }],
    match: { kind: 'contains', value: 'x' },
    userId: user.id,
  });
  const applyResult = await applyMerchantRuleService(asDb(serviceDb), user.id, {
    id: rule.id,
  });
  await undoRuleRunService(asDb(serviceDb), user.id, {
    runId: applyResult.runId,
  });

  await expect(
    undoRuleRunService(asDb(serviceDb), user.id, { runId: applyResult.runId }),
  ).rejects.toMatchObject({ status: 409 });
});

test('undo — rejects when undoable window has expired (410)', async ({
  serviceDb,
}) => {
  const { user } = await setup(serviceDb);
  const rule = await insertMerchantRule(serviceDb, {
    match: { kind: 'contains', value: 'x' },
    userId: user.id,
  });
  const run = await insertRuleRun(serviceDb, {
    ruleId: rule.id,
    undoableUntil: new Date(Date.now() - 60_000),
    undoData: { transactions: [] },
  });

  await expect(
    undoRuleRunService(asDb(serviceDb), user.id, { runId: run.id }),
  ).rejects.toMatchObject({ status: 410 });
});

test('undo — rejects non-owner with 404', async ({ serviceDb }) => {
  const { account, user } = await setup(serviceDb);
  const other = await insertUser(serviceDb);
  const category = await insertCategory(serviceDb, { userId: user.id });
  await insertTransaction(serviceDb, {
    accountId: account.id,
    description: 'x',
  });
  const rule = await insertMerchantRule(serviceDb, {
    actions: [{ categoryId: category.id, kind: 'setCategory' }],
    match: { kind: 'contains', value: 'x' },
    userId: user.id,
  });
  const applyResult = await applyMerchantRuleService(asDb(serviceDb), user.id, {
    id: rule.id,
  });

  await expect(
    undoRuleRunService(asDb(serviceDb), other.id, { runId: applyResult.runId }),
  ).rejects.toMatchObject({ status: 404 });
});

test('undo — rejects nonexistent runId with 404', async ({ serviceDb }) => {
  const { user } = await setup(serviceDb);

  await expect(
    undoRuleRunService(asDb(serviceDb), user.id, { runId: fakeId() }),
  ).rejects.toMatchObject({ status: 404 });
});

test('undo — blocks when a later non-undone run touched the same transactions (409)', async ({
  serviceDb,
}) => {
  const { account, user } = await setup(serviceDb);
  const category1 = await insertCategory(serviceDb, { userId: user.id });
  const category2 = await insertCategory(serviceDb, { userId: user.id });
  await insertTransaction(serviceDb, {
    accountId: account.id,
    description: 'x',
  });

  const rule1 = await insertMerchantRule(serviceDb, {
    actions: [{ categoryId: category1.id, kind: 'setCategory' }],
    match: { kind: 'contains', value: 'x' },
    userId: user.id,
  });
  const firstRun = await applyMerchantRuleService(asDb(serviceDb), user.id, {
    id: rule1.id,
  });

  const rule2 = await insertMerchantRule(serviceDb, {
    actions: [{ categoryId: category2.id, kind: 'setCategory' }],
    match: { kind: 'contains', value: 'x' },
    userId: user.id,
  });
  await applyMerchantRuleService(asDb(serviceDb), user.id, { id: rule2.id });

  await expect(
    undoRuleRunService(asDb(serviceDb), user.id, { runId: firstRun.runId }),
  ).rejects.toMatchObject({ status: 409 });
});

test('undo — allows undoing later run even when earlier run exists on same transactions', async ({
  serviceDb,
}) => {
  const { account, user } = await setup(serviceDb);
  const category1 = await insertCategory(serviceDb, { userId: user.id });
  const category2 = await insertCategory(serviceDb, { userId: user.id });
  await insertTransaction(serviceDb, {
    accountId: account.id,
    description: 'x',
  });

  const rule1 = await insertMerchantRule(serviceDb, {
    actions: [{ categoryId: category1.id, kind: 'setCategory' }],
    match: { kind: 'contains', value: 'x' },
    userId: user.id,
  });
  await applyMerchantRuleService(asDb(serviceDb), user.id, { id: rule1.id });

  const rule2 = await insertMerchantRule(serviceDb, {
    actions: [{ categoryId: category2.id, kind: 'setCategory' }],
    match: { kind: 'contains', value: 'x' },
    userId: user.id,
  });
  const secondRun = await applyMerchantRuleService(asDb(serviceDb), user.id, {
    id: rule2.id,
  });

  const result = await undoRuleRunService(asDb(serviceDb), user.id, {
    runId: secondRun.runId,
  });
  expect(result.runId).toBe(secondRun.runId);
});

test('undo — is idempotent on empty runs (no affected ids)', async ({
  serviceDb,
}) => {
  const { user } = await setup(serviceDb);
  const rule = await insertMerchantRule(serviceDb, {
    match: { kind: 'contains', value: 'x' },
    userId: user.id,
  });
  const run = await insertRuleRun(serviceDb, {
    ruleId: rule.id,
    undoData: { transactions: [] },
  });

  const result = await undoRuleRunService(asDb(serviceDb), user.id, {
    runId: run.id,
  });
  expect(result.restoredCount).toBe(0);
});

test('undo — skips soft-deleted transactions (does not resurrect them)', async ({
  serviceDb,
}) => {
  const { account, user } = await setup(serviceDb);
  const oldCategory = await insertCategory(serviceDb, { userId: user.id });
  const newCategory = await insertCategory(serviceDb, { userId: user.id });
  const tx = await insertTransaction(serviceDb, {
    accountId: account.id,
    categoryId: oldCategory.id,
    description: 'x',
  });

  const rule = await insertMerchantRule(serviceDb, {
    actions: [{ categoryId: newCategory.id, kind: 'setCategory' }],
    match: { kind: 'contains', value: 'x' },
    userId: user.id,
  });
  const applyResult = await applyMerchantRuleService(asDb(serviceDb), user.id, {
    id: rule.id,
  });

  await serviceDb
    .update(transactions)
    .set({ deletedAt: new Date() })
    .where(eq(transactions.id, tx.id));

  const result = await undoRuleRunService(asDb(serviceDb), user.id, {
    runId: applyResult.runId,
  });
  expect(result.restoredCount).toBe(0);
  expect(result.skippedCount).toBe(1);

  const [after] = await serviceDb
    .select()
    .from(transactions)
    .where(eq(transactions.id, tx.id));
  // Soft-deleted row was skipped by the undo — categoryId stays at the
  // apply-time value, not rolled back.
  expect(after.categoryId).toBe(newCategory.id);
});

test('undo — restores multiple rows in a batch', async ({ serviceDb }) => {
  const { account, user } = await setup(serviceDb);
  const category = await insertCategory(serviceDb, { userId: user.id });

  const txs = await Promise.all([
    insertTransaction(serviceDb, { accountId: account.id, description: 'x' }),
    insertTransaction(serviceDb, { accountId: account.id, description: 'x' }),
    insertTransaction(serviceDb, { accountId: account.id, description: 'x' }),
  ]);

  const rule = await insertMerchantRule(serviceDb, {
    actions: [{ categoryId: category.id, kind: 'setCategory' }],
    match: { kind: 'contains', value: 'x' },
    userId: user.id,
  });
  const applyResult = await applyMerchantRuleService(asDb(serviceDb), user.id, {
    id: rule.id,
  });

  await undoRuleRunService(asDb(serviceDb), user.id, {
    runId: applyResult.runId,
  });

  const rows = await serviceDb
    .select()
    .from(transactions)
    .where(
      inArray(
        transactions.id,
        txs.map((tx) => tx.id),
      ),
    );
  for (const row of rows) {
    expect(row.categoryId).toBeNull();
  }
});

test('undo — soft-deleted row: tag rollback is also skipped', async ({
  serviceDb,
}) => {
  const { account, user } = await setup(serviceDb);
  const tagOld = await insertTag(serviceDb, { userId: user.id });
  const tagNew = await insertTag(serviceDb, { userId: user.id });
  const tx = await insertTransaction(serviceDb, {
    accountId: account.id,
    description: 'x',
  });
  await serviceDb
    .insert(transactionTags)
    .values({ createdById: user.id, tagId: tagOld.id, transactionId: tx.id });

  const rule = await insertMerchantRule(serviceDb, {
    actions: [{ kind: 'setTags', mode: 'replace', tagIds: [tagNew.id] }],
    match: { kind: 'contains', value: 'x' },
    userId: user.id,
  });
  const applyResult = await applyMerchantRuleService(asDb(serviceDb), user.id, {
    id: rule.id,
  });

  await serviceDb
    .update(transactions)
    .set({ deletedAt: new Date() })
    .where(eq(transactions.id, tx.id));

  const result = await undoRuleRunService(asDb(serviceDb), user.id, {
    runId: applyResult.runId,
  });
  expect(result.restoredCount).toBe(0);
  expect(result.skippedCount).toBe(1);

  // Tag state from apply stays intact — undo refused to touch a deleted row.
  const after = await serviceDb
    .select()
    .from(transactionTags)
    .where(eq(transactionTags.transactionId, tx.id));
  expect(after.map((row) => row.tagId)).toStrictEqual([tagNew.id]);
});

test('undo — collision check uses id ordering, not runAt (pins UUIDv7 semantics)', async ({
  serviceDb,
}) => {
  const { user } = await setup(serviceDb);
  const rule = await insertMerchantRule(serviceDb, {
    match: { kind: 'contains', value: 'x' },
    userId: user.id,
  });

  const sharedTxId = fakeId();

  // run1 inserted first → lower UUIDv7 id, but LATER runAt.
  // run2 inserted second → higher UUIDv7 id, but EARLIER runAt.
  // A naive `runAt > run.runAt` collision check would miss this; the
  // `id > run.id` implementation we ship catches it correctly.
  const run1 = await insertRuleRun(serviceDb, {
    affectedTransactionIds: [sharedTxId],
    ruleId: rule.id,
    runAt: new Date('2026-02-01T00:00:00Z'),
    undoData: { transactions: [] },
  });
  await insertRuleRun(serviceDb, {
    affectedTransactionIds: [sharedTxId],
    ruleId: rule.id,
    runAt: new Date('2026-01-01T00:00:00Z'),
    undoData: { transactions: [] },
  });

  await expect(
    undoRuleRunService(asDb(serviceDb), user.id, { runId: run1.id }),
  ).rejects.toMatchObject({ status: 409 });
});
