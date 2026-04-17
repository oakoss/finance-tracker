import { and, eq, inArray } from 'drizzle-orm';
import { expect } from 'vitest';

import type { Db } from '@/db';

import { auditLogs } from '@/db/schema';
import { merchantRules, ruleRuns } from '@/modules/rules/db/schema';
import { applyMerchantRuleService } from '@/modules/rules/services/apply-merchant-rule';
import {
  tags,
  transactions,
  transactionTags,
} from '@/modules/transactions/db/schema';
import { fakeId, type Db as TestDb } from '~test/factories/base';
import { insertCategory } from '~test/factories/category.factory';
import { insertLedgerAccount } from '~test/factories/ledger-account.factory';
import { insertMerchantRule } from '~test/factories/merchant-rule.factory';
import { insertPayee } from '~test/factories/payee.factory';
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

test('apply — setCategory mutates matched rows and writes undoData with before.categoryId', async ({
  serviceDb,
}) => {
  const { account, user } = await setup(serviceDb);
  const oldCategory = await insertCategory(serviceDb, { userId: user.id });
  const newCategory = await insertCategory(serviceDb, { userId: user.id });

  const tx = await insertTransaction(serviceDb, {
    accountId: account.id,
    categoryId: oldCategory.id,
    description: 'amazon charge',
  });

  const rule = await insertMerchantRule(serviceDb, {
    actions: [{ categoryId: newCategory.id, kind: 'setCategory' }],
    match: { kind: 'contains', value: 'amazon' },
    userId: user.id,
  });

  const result = await applyMerchantRuleService(asDb(serviceDb), user.id, {
    id: rule.id,
  });

  expect(result.count).toBe(1);
  expect(result.undoableUntil).toBeInstanceOf(Date);

  const [after] = await serviceDb
    .select()
    .from(transactions)
    .where(eq(transactions.id, tx.id));
  expect(after.categoryId).toBe(newCategory.id);
  expect(after.updatedById).toBe(user.id);

  const [run] = await serviceDb
    .select()
    .from(ruleRuns)
    .where(eq(ruleRuns.id, result.runId));
  expect(run.affectedTransactionIds).toStrictEqual([tx.id]);
  expect(run.undoData).toStrictEqual({
    transactions: [
      { before: { categoryId: oldCategory.id }, transactionId: tx.id },
    ],
  });
});

test('apply — setNote writes memo and captures before.note', async ({
  serviceDb,
}) => {
  const { account, user } = await setup(serviceDb);
  const tx = await insertTransaction(serviceDb, {
    accountId: account.id,
    description: 'coffee',
    memo: 'prior',
  });

  const rule = await insertMerchantRule(serviceDb, {
    actions: [{ kind: 'setNote', value: 'new memo' }],
    match: { kind: 'contains', value: 'coffee' },
    userId: user.id,
  });

  await applyMerchantRuleService(asDb(serviceDb), user.id, { id: rule.id });

  const [after] = await serviceDb
    .select()
    .from(transactions)
    .where(eq(transactions.id, tx.id));
  expect(after.memo).toBe('new memo');

  const [run] = await serviceDb
    .select()
    .from(ruleRuns)
    .where(eq(ruleRuns.ruleId, rule.id));
  expect(run.undoData.transactions[0]).toStrictEqual({
    before: { note: 'prior' },
    transactionId: tx.id,
  });
});

test('apply — setPayee with existing payee records before.payeeId', async ({
  serviceDb,
}) => {
  const { account, user } = await setup(serviceDb);
  const oldPayee = await insertPayee(serviceDb, { userId: user.id });
  const newPayee = await insertPayee(serviceDb, { userId: user.id });
  const tx = await insertTransaction(serviceDb, {
    accountId: account.id,
    description: 'x',
    payeeId: oldPayee.id,
  });

  const rule = await insertMerchantRule(serviceDb, {
    actions: [{ kind: 'setPayee', payeeId: newPayee.id }],
    match: { kind: 'contains', value: 'x' },
    userId: user.id,
  });

  await applyMerchantRuleService(asDb(serviceDb), user.id, { id: rule.id });

  const [after] = await serviceDb
    .select()
    .from(transactions)
    .where(eq(transactions.id, tx.id));
  expect(after.payeeId).toBe(newPayee.id);

  const [run] = await serviceDb
    .select()
    .from(ruleRuns)
    .where(eq(ruleRuns.ruleId, rule.id));
  expect(run.undoData.transactions[0].before).toStrictEqual({
    payeeId: oldPayee.id,
  });
});

test('apply — setTags replace records both added and removed in undoData', async ({
  serviceDb,
}) => {
  const { account, user } = await setup(serviceDb);
  const tagOld = await insertTag(serviceDb, { userId: user.id });
  const tagNew = await insertTag(serviceDb, { userId: user.id });
  const tx = await insertTransaction(serviceDb, {
    accountId: account.id,
    description: 'coffee',
  });
  await serviceDb
    .insert(transactionTags)
    .values({ createdById: user.id, tagId: tagOld.id, transactionId: tx.id });

  const rule = await insertMerchantRule(serviceDb, {
    actions: [{ kind: 'setTags', mode: 'replace', tagIds: [tagNew.id] }],
    match: { kind: 'contains', value: 'coffee' },
    userId: user.id,
  });

  await applyMerchantRuleService(asDb(serviceDb), user.id, { id: rule.id });

  const after = await serviceDb
    .select()
    .from(transactionTags)
    .where(eq(transactionTags.transactionId, tx.id));
  expect(after.map((row) => row.tagId)).toStrictEqual([tagNew.id]);

  const [run] = await serviceDb
    .select()
    .from(ruleRuns)
    .where(eq(ruleRuns.ruleId, rule.id));
  expect(run.undoData.transactions[0]).toStrictEqual({
    tagsAdded: [tagNew.id],
    tagsRemoved: [tagOld.id],
    transactionId: tx.id,
  });
});

test('apply — setTags append deduplicates against existing tags on the row', async ({
  serviceDb,
}) => {
  const { account, user } = await setup(serviceDb);
  const tagA = await insertTag(serviceDb, { userId: user.id });
  const tagB = await insertTag(serviceDb, { userId: user.id });
  const tx = await insertTransaction(serviceDb, {
    accountId: account.id,
    description: 'x',
  });
  await serviceDb
    .insert(transactionTags)
    .values({ createdById: user.id, tagId: tagA.id, transactionId: tx.id });

  const rule = await insertMerchantRule(serviceDb, {
    actions: [{ kind: 'setTags', mode: 'append', tagIds: [tagA.id, tagB.id] }],
    match: { kind: 'contains', value: 'x' },
    userId: user.id,
  });

  await applyMerchantRuleService(asDb(serviceDb), user.id, { id: rule.id });

  const after = await serviceDb
    .select()
    .from(transactionTags)
    .where(eq(transactionTags.transactionId, tx.id));
  expect(after.map((row) => row.tagId).toSorted()).toStrictEqual(
    [tagA.id, tagB.id].toSorted(),
  );

  const [run] = await serviceDb
    .select()
    .from(ruleRuns)
    .where(eq(ruleRuns.ruleId, rule.id));
  expect(run.undoData.transactions[0].tagsAdded).toStrictEqual([tagB.id]);
  expect(run.undoData.transactions[0].tagsRemoved).toBeUndefined();
});

test('apply — last-action-wins on duplicate setCategory actions', async ({
  serviceDb,
}) => {
  const { account, user } = await setup(serviceDb);
  const origCategory = await insertCategory(serviceDb, { userId: user.id });
  const midCategory = await insertCategory(serviceDb, { userId: user.id });
  const finalCategory = await insertCategory(serviceDb, { userId: user.id });
  const tx = await insertTransaction(serviceDb, {
    accountId: account.id,
    categoryId: origCategory.id,
    description: 'x',
  });

  const rule = await insertMerchantRule(serviceDb, {
    actions: [
      { categoryId: midCategory.id, kind: 'setCategory' },
      { categoryId: finalCategory.id, kind: 'setCategory' },
    ],
    match: { kind: 'contains', value: 'x' },
    userId: user.id,
  });

  await applyMerchantRuleService(asDb(serviceDb), user.id, { id: rule.id });

  const [after] = await serviceDb
    .select()
    .from(transactions)
    .where(eq(transactions.id, tx.id));
  expect(after.categoryId).toBe(finalCategory.id);

  const [run] = await serviceDb
    .select()
    .from(ruleRuns)
    .where(eq(ruleRuns.ruleId, rule.id));
  expect(run.undoData.transactions[0].before).toStrictEqual({
    categoryId: origCategory.id,
  });
});

test('apply — no-op when row already has target category produces empty run', async ({
  serviceDb,
}) => {
  const { account, user } = await setup(serviceDb);
  const category = await insertCategory(serviceDb, { userId: user.id });
  await insertTransaction(serviceDb, {
    accountId: account.id,
    categoryId: category.id,
    description: 'x',
  });

  const rule = await insertMerchantRule(serviceDb, {
    actions: [{ categoryId: category.id, kind: 'setCategory' }],
    match: { kind: 'contains', value: 'x' },
    userId: user.id,
  });

  const result = await applyMerchantRuleService(asDb(serviceDb), user.id, {
    id: rule.id,
  });

  expect(result.count).toBe(0);

  const [run] = await serviceDb
    .select()
    .from(ruleRuns)
    .where(eq(ruleRuns.ruleId, rule.id));
  expect(run.affectedTransactionIds).toStrictEqual([]);
  expect(run.undoData.transactions).toStrictEqual([]);
});

test('apply — rejects inactive rule with 422', async ({ serviceDb }) => {
  const { user } = await setup(serviceDb);
  const category = await insertCategory(serviceDb, { userId: user.id });
  const rule = await insertMerchantRule(serviceDb, {
    actions: [{ categoryId: category.id, kind: 'setCategory' }],
    isActive: false,
    match: { kind: 'contains', value: 'x' },
    userId: user.id,
  });

  await expect(
    applyMerchantRuleService(asDb(serviceDb), user.id, { id: rule.id }),
  ).rejects.toMatchObject({ status: 422 });
});

test('apply — rejects rule with setExcludedFromBudget action as 501', async ({
  serviceDb,
}) => {
  const { user } = await setup(serviceDb);
  const rule = await insertMerchantRule(serviceDb, {
    actions: [{ kind: 'setExcludedFromBudget', value: true }],
    match: { kind: 'contains', value: 'x' },
    userId: user.id,
  });

  await expect(
    applyMerchantRuleService(asDb(serviceDb), user.id, { id: rule.id }),
  ).rejects.toMatchObject({ status: 501 });
});

test('apply — rejects non-owner with 404', async ({ serviceDb }) => {
  const { user } = await setup(serviceDb);
  const other = await insertUser(serviceDb);
  const category = await insertCategory(serviceDb, { userId: user.id });
  const rule = await insertMerchantRule(serviceDb, {
    actions: [{ categoryId: category.id, kind: 'setCategory' }],
    match: { kind: 'contains', value: 'x' },
    userId: user.id,
  });

  await expect(
    applyMerchantRuleService(asDb(serviceDb), other.id, { id: rule.id }),
  ).rejects.toMatchObject({ status: 404 });
});

test('apply — rejects rule referencing category owned by another user with 422', async ({
  serviceDb,
}) => {
  const { user } = await setup(serviceDb);
  const other = await insertUser(serviceDb);
  const foreignCategory = await insertCategory(serviceDb, { userId: other.id });
  const rule = await insertMerchantRule(serviceDb, {
    actions: [{ categoryId: foreignCategory.id, kind: 'setCategory' }],
    match: { kind: 'contains', value: 'x' },
    userId: user.id,
  });

  await expect(
    applyMerchantRuleService(asDb(serviceDb), user.id, { id: rule.id }),
  ).rejects.toMatchObject({ status: 422 });
});

test('apply — rejects rule referencing nonexistent category with 422', async ({
  serviceDb,
}) => {
  const { user } = await setup(serviceDb);
  const rule = await insertMerchantRule(serviceDb, {
    actions: [{ categoryId: fakeId(), kind: 'setCategory' }],
    match: { kind: 'contains', value: 'x' },
    userId: user.id,
  });

  await expect(
    applyMerchantRuleService(asDb(serviceDb), user.id, { id: rule.id }),
  ).rejects.toMatchObject({ status: 422 });
});

test('apply — does not touch transactions owned by another user', async ({
  serviceDb,
}) => {
  const { account: accountA, user: userA } = await setup(serviceDb);
  const { account: accountB } = await setup(serviceDb);

  const categoryA = await insertCategory(serviceDb, { userId: userA.id });
  const txA = await insertTransaction(serviceDb, {
    accountId: accountA.id,
    description: 'coffee',
  });
  const txB = await insertTransaction(serviceDb, {
    accountId: accountB.id,
    description: 'coffee',
  });

  const rule = await insertMerchantRule(serviceDb, {
    actions: [{ categoryId: categoryA.id, kind: 'setCategory' }],
    match: { kind: 'contains', value: 'coffee' },
    userId: userA.id,
  });

  const result = await applyMerchantRuleService(asDb(serviceDb), userA.id, {
    id: rule.id,
  });

  expect(result.count).toBe(1);

  const rows = await serviceDb
    .select()
    .from(transactions)
    .where(inArray(transactions.id, [txA.id, txB.id]));
  const byId = new Map(rows.map((row) => [row.id, row]));
  expect(byId.get(txA.id)?.categoryId).toBe(categoryA.id);
  expect(byId.get(txB.id)?.categoryId).toBeNull();
});

test('apply — batches through more than BATCH_SIZE rows and records all affected ids', async ({
  serviceDb,
}) => {
  const { account, user } = await setup(serviceDb);
  const category = await insertCategory(serviceDb, { userId: user.id });

  // One past BATCH_SIZE (500) to prove the pagination loop, without paying
  // for a second full batch round-trip.
  const ROW_COUNT = 501;
  const rowPromises: Promise<unknown>[] = [];
  for (let i = 0; i < ROW_COUNT; i++) {
    rowPromises.push(
      insertTransaction(serviceDb, {
        accountId: account.id,
        description: 'match-me',
      }),
    );
  }
  await Promise.all(rowPromises);

  const rule = await insertMerchantRule(serviceDb, {
    actions: [{ categoryId: category.id, kind: 'setCategory' }],
    match: { kind: 'contains', value: 'match-me' },
    userId: user.id,
  });

  const result = await applyMerchantRuleService(asDb(serviceDb), user.id, {
    id: rule.id,
  });

  expect(result.count).toBe(ROW_COUNT);

  const [run] = await serviceDb
    .select()
    .from(ruleRuns)
    .where(eq(ruleRuns.ruleId, rule.id));
  expect(run.affectedTransactionIds).toHaveLength(ROW_COUNT);
  expect(run.undoData.transactions).toHaveLength(ROW_COUNT);
});

test('apply — writes audit log for the new rule_runs record', async ({
  serviceDb,
}) => {
  const { account, user } = await setup(serviceDb);
  const category = await insertCategory(serviceDb, { userId: user.id });
  await insertTransaction(serviceDb, {
    accountId: account.id,
    description: 'coffee',
  });
  const rule = await insertMerchantRule(serviceDb, {
    actions: [{ categoryId: category.id, kind: 'setCategory' }],
    match: { kind: 'contains', value: 'coffee' },
    userId: user.id,
  });

  const result = await applyMerchantRuleService(asDb(serviceDb), user.id, {
    id: rule.id,
  });

  const logs = await serviceDb
    .select()
    .from(auditLogs)
    .where(
      and(
        eq(auditLogs.recordId, result.runId),
        eq(auditLogs.tableName, 'rule_runs'),
      ),
    );
  expect(logs).toHaveLength(1);
  expect(logs[0].afterData).toMatchObject({ affectedCount: 1 });
});

test('apply — rejects soft-deleted rule with 404', async ({ serviceDb }) => {
  const { user } = await setup(serviceDb);
  const category = await insertCategory(serviceDb, { userId: user.id });
  const rule = await insertMerchantRule(serviceDb, {
    actions: [{ categoryId: category.id, kind: 'setCategory' }],
    match: { kind: 'contains', value: 'x' },
    userId: user.id,
  });
  await serviceDb
    .update(merchantRules)
    .set({ deletedAt: new Date() })
    .where(eq(merchantRules.id, rule.id));

  await expect(
    applyMerchantRuleService(asDb(serviceDb), user.id, { id: rule.id }),
  ).rejects.toMatchObject({ status: 404 });
});

test('apply — rejects rule referencing a soft-deleted tag with 422', async ({
  serviceDb,
}) => {
  const { user } = await setup(serviceDb);
  const tag = await insertTag(serviceDb, { userId: user.id });
  await serviceDb
    .update(tags)
    .set({ deletedAt: new Date() })
    .where(eq(tags.id, tag.id));

  const rule = await insertMerchantRule(serviceDb, {
    actions: [{ kind: 'setTags', mode: 'append', tagIds: [tag.id] }],
    match: { kind: 'contains', value: 'x' },
    userId: user.id,
  });

  await expect(
    applyMerchantRuleService(asDb(serviceDb), user.id, { id: rule.id }),
  ).rejects.toMatchObject({ status: 422 });
});

test('apply — regex predicate mutates matching rows (~* operator)', async ({
  serviceDb,
}) => {
  const { account, user } = await setup(serviceDb);
  const category = await insertCategory(serviceDb, { userId: user.id });
  await insertTransaction(serviceDb, {
    accountId: account.id,
    description: 'AMZN Prime',
  });
  await insertTransaction(serviceDb, {
    accountId: account.id,
    description: 'Other merchant',
  });

  const rule = await insertMerchantRule(serviceDb, {
    actions: [{ categoryId: category.id, kind: 'setCategory' }],
    match: { kind: 'regex', value: '^AMZN' },
    userId: user.id,
  });

  const result = await applyMerchantRuleService(asDb(serviceDb), user.id, {
    id: rule.id,
  });

  expect(result.count).toBe(1);
});
