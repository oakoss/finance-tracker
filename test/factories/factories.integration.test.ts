import { expect } from 'vitest';

import { insertCategory } from '~test/factories/category.factory';
import { insertLedgerAccount } from '~test/factories/ledger-account.factory';
import { insertPayee } from '~test/factories/payee.factory';
import { insertTag } from '~test/factories/tag.factory';
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
