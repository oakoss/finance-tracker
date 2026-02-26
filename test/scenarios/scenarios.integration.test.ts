import { expect } from 'vitest';

import { test } from '~test/integration-setup';
import { createFullTransaction } from '~test/scenarios/full-transaction';
import { createMonthlySpending } from '~test/scenarios/monthly-spending';
import { createMultiAccountUser } from '~test/scenarios/multi-account-user';

test('createFullTransaction — creates complete chain', async ({ db }) => {
  const ctx = await createFullTransaction(db);
  expect(ctx.user.id).toBeDefined();
  expect(ctx.account.userId).toBe(ctx.user.id);
  expect(ctx.category.userId).toBe(ctx.user.id);
  expect(ctx.payee.userId).toBe(ctx.user.id);
  expect(ctx.transaction.accountId).toBe(ctx.account.id);
  expect(ctx.transaction.categoryId).toBe(ctx.category.id);
  expect(ctx.transaction.payeeId).toBe(ctx.payee.id);
});

test('createMultiAccountUser — creates three account types', async ({ db }) => {
  const ctx = await createMultiAccountUser(db);
  expect(ctx.user.id).toBeDefined();
  expect(ctx.checking.type).toBe('checking');
  expect(ctx.savings.type).toBe('savings');
  expect(ctx.creditCard.type).toBe('credit_card');
  expect(ctx.checking.userId).toBe(ctx.user.id);
  expect(ctx.savings.userId).toBe(ctx.user.id);
  expect(ctx.creditCard.userId).toBe(ctx.user.id);
});

test('createMonthlySpending — creates 30 transactions', async ({ db }) => {
  const ctx = await createMonthlySpending(db);
  expect(ctx.user.id).toBeDefined();
  expect(ctx.account.userId).toBe(ctx.user.id);
  expect(ctx.categories).toHaveLength(5);
  expect(ctx.payees).toHaveLength(3);
  expect(ctx.transactions).toHaveLength(30);

  for (const txn of ctx.transactions) {
    expect(txn.accountId).toBe(ctx.account.id);
  }
});
