import { expect } from 'vitest';

import { insertAccountTermsWithAccount } from '~test/factories/account-terms-with-account.factory';
import { insertAccountWithUser } from '~test/factories/account-with-user.factory';
import { insertCategoryWithUser } from '~test/factories/category-with-user.factory';
import { insertCategory } from '~test/factories/category.factory';
import { insertLedgerAccount } from '~test/factories/ledger-account.factory';
import { insertPayee } from '~test/factories/payee.factory';
import { insertTag } from '~test/factories/tag.factory';
import { insertTransactionTag } from '~test/factories/transaction-tag.factory';
import { insertTransactionWithRelations } from '~test/factories/transaction-with-relations.factory';
import { insertTransaction } from '~test/factories/transaction.factory';
import { insertTransfer } from '~test/factories/transfer.factory';
import { insertUser } from '~test/factories/user.factory';
import { test } from '~test/integration-setup';

test('insertUser — inserts and returns a user', async ({ db }) => {
  const user = await insertUser(db);
  expect(user.id).toBeDefined();
  expect(user.email).toBeDefined();
  expect(user.name).toBeDefined();
  expect(user.createdAt).toBeInstanceOf(Date);
});

test('insertUser — applies overrides', async ({ db }) => {
  const user = await insertUser(db, {
    email: 'integration@test.com',
    name: 'Integration User',
  });
  expect(user.email).toBe('integration@test.com');
  expect(user.name).toBe('Integration User');
});

test('insertLedgerAccount — inserts linked to user', async ({ db }) => {
  const user = await insertUser(db);
  const account = await insertLedgerAccount(db, { userId: user.id });
  expect(account.id).toBeDefined();
  expect(account.userId).toBe(user.id);
  expect(account.status).toBe('active');
});

test('insertCategory — inserts linked to user', async ({ db }) => {
  const user = await insertUser(db);
  const category = await insertCategory(db, { userId: user.id });
  expect(category.id).toBeDefined();
  expect(category.userId).toBe(user.id);
  expect(category.type).toBeDefined();
});

test('insertPayee — inserts linked to user', async ({ db }) => {
  const user = await insertUser(db);
  const payee = await insertPayee(db, { userId: user.id });
  expect(payee.id).toBeDefined();
  expect(payee.userId).toBe(user.id);
  expect(payee.name).toBeDefined();
});

test('insertTag — inserts linked to user', async ({ db }) => {
  const user = await insertUser(db);
  const tag = await insertTag(db, { userId: user.id });
  expect(tag.id).toBeDefined();
  expect(tag.userId).toBe(user.id);
  expect(tag.name).toBeDefined();
});

test('insertTransaction — inserts linked to account', async ({ db }) => {
  const user = await insertUser(db);
  const account = await insertLedgerAccount(db, { userId: user.id });
  const txn = await insertTransaction(db, { accountId: account.id });
  expect(txn.id).toBeDefined();
  expect(txn.accountId).toBe(account.id);
  expect(txn.amountCents).toBeGreaterThan(0);
});

test('insertTransactionTag — inserts linking transaction and tag', async ({
  db,
}) => {
  const user = await insertUser(db);
  const account = await insertLedgerAccount(db, { userId: user.id });
  const txn = await insertTransaction(db, { accountId: account.id });
  const tag = await insertTag(db, { userId: user.id });
  const tt = await insertTransactionTag(db, {
    tagId: tag.id,
    transactionId: txn.id,
  });
  expect(tt.id).toBeDefined();
  expect(tt.tagId).toBe(tag.id);
  expect(tt.transactionId).toBe(txn.id);
});

test('insertTransactionTag — applies createdById override', async ({ db }) => {
  const user = await insertUser(db);
  const account = await insertLedgerAccount(db, { userId: user.id });
  const txn = await insertTransaction(db, { accountId: account.id });
  const tag = await insertTag(db, { userId: user.id });
  const tt = await insertTransactionTag(db, {
    createdById: user.id,
    tagId: tag.id,
    transactionId: txn.id,
  });
  expect(tt.createdById).toBe(user.id);
});

test('insertTransfer — inserts between two accounts', async ({ db }) => {
  const user = await insertUser(db);
  const from = await insertLedgerAccount(db, { userId: user.id });
  const to = await insertLedgerAccount(db, { userId: user.id });
  const transfer = await insertTransfer(db, {
    fromAccountId: from.id,
    toAccountId: to.id,
    userId: user.id,
  });
  expect(transfer.id).toBeDefined();
  expect(transfer.fromAccountId).toBe(from.id);
  expect(transfer.toAccountId).toBe(to.id);
  expect(transfer.userId).toBe(user.id);
});

// --- Composite factories ---

test('insertAccountWithUser — creates user and account', async ({ db }) => {
  const { account, user } = await insertAccountWithUser(db);
  expect(user.id).toBeDefined();
  expect(account.id).toBeDefined();
  expect(account.userId).toBe(user.id);
});

test('insertAccountWithUser — applies overrides', async ({ db }) => {
  const { account, user } = await insertAccountWithUser(db, {
    account: { type: 'savings' },
    user: { name: 'Composite User' },
  });
  expect(user.name).toBe('Composite User');
  expect(account.type).toBe('savings');
  expect(account.userId).toBe(user.id);
});

test('insertCategoryWithUser — creates user and category', async ({ db }) => {
  const { category, user } = await insertCategoryWithUser(db);
  expect(user.id).toBeDefined();
  expect(category.id).toBeDefined();
  expect(category.userId).toBe(user.id);
});

test('insertCategoryWithUser — applies overrides', async ({ db }) => {
  const { category } = await insertCategoryWithUser(db, {
    category: { name: 'Custom Category', type: 'income' },
  });
  expect(category.name).toBe('Custom Category');
  expect(category.type).toBe('income');
});

test('insertAccountTermsWithAccount — creates user, account, and terms', async ({
  db,
}) => {
  const { account, terms, user } = await insertAccountTermsWithAccount(db);
  expect(user.id).toBeDefined();
  expect(account.id).toBeDefined();
  expect(terms.id).toBeDefined();
  expect(account.userId).toBe(user.id);
  expect(terms.accountId).toBe(account.id);
});

test('insertAccountTermsWithAccount — applies overrides', async ({ db }) => {
  const { account, terms } = await insertAccountTermsWithAccount(db, {
    account: { type: 'credit_card' },
    terms: { aprBps: 2499 },
  });
  expect(account.type).toBe('credit_card');
  expect(terms.aprBps).toBe(2499);
  expect(terms.accountId).toBe(account.id);
});

test('insertTransactionWithRelations — creates minimal transaction', async ({
  db,
}) => {
  const { account, category, payee, transaction, user } =
    await insertTransactionWithRelations(db);
  expect(user.id).toBeDefined();
  expect(account.userId).toBe(user.id);
  expect(transaction.accountId).toBe(account.id);
  expect(category).toBeNull();
  expect(payee).toBeNull();
  expect(transaction.categoryId).toBeNull();
  expect(transaction.payeeId).toBeNull();
});

test('insertTransactionWithRelations — creates with category and payee', async ({
  db,
}) => {
  const { category, payee, transaction } = await insertTransactionWithRelations(
    db,
    {
      withCategory: true,
      withPayee: true,
    },
  );
  expect(category).not.toBeNull();
  expect(payee).not.toBeNull();
  expect(transaction.categoryId).toBe(category!.id);
  expect(transaction.payeeId).toBe(payee!.id);
});

test('insertTransactionWithRelations — applies overrides', async ({ db }) => {
  const { account, transaction } = await insertTransactionWithRelations(db, {
    account: { type: 'checking' },
    transaction: { amountCents: 9999, description: 'Override Test' },
  });
  expect(account.type).toBe('checking');
  expect(transaction.amountCents).toBe(9999);
  expect(transaction.description).toBe('Override Test');
});
