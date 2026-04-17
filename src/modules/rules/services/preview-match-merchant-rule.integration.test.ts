import { expect } from 'vitest';

import type { Db } from '@/db';

import { previewMatchMerchantRuleService } from '@/modules/rules/services/preview-match-merchant-rule';
import type { Db as TestDb } from '~test/factories/base';
import { insertLedgerAccount } from '~test/factories/ledger-account.factory';
import { insertTransaction } from '~test/factories/transaction.factory';
import { insertUser } from '~test/factories/user.factory';
import { test } from '~test/integration-setup';

const asDb = (db: TestDb) => db as unknown as Db;

async function setup(db: TestDb) {
  const user = await insertUser(db);
  const account = await insertLedgerAccount(db, { userId: user.id });
  return { account, user };
}

test('preview-match — contains kind returns matching count + sample', async ({
  serviceDb,
}) => {
  const { account, user } = await setup(serviceDb);
  await insertTransaction(serviceDb, {
    accountId: account.id,
    description: 'AMZN Marketplace',
  });
  await insertTransaction(serviceDb, {
    accountId: account.id,
    description: 'Other merchant',
  });

  const result = await previewMatchMerchantRuleService(
    asDb(serviceDb),
    user.id,
    { kind: 'contains', value: 'amzn' },
  );

  expect(result.count).toBe(1);
  expect(result.sample[0].description).toBe('AMZN Marketplace');
});

test('preview-match — applies amount + direction + account scope', async ({
  serviceDb,
}) => {
  const user = await insertUser(serviceDb);
  const accountA = await insertLedgerAccount(serviceDb, { userId: user.id });
  const accountB = await insertLedgerAccount(serviceDb, { userId: user.id });

  await insertTransaction(serviceDb, {
    accountId: accountA.id,
    amountCents: 500,
    description: 'coffee',
    direction: 'debit',
  });
  await insertTransaction(serviceDb, {
    accountId: accountB.id,
    amountCents: 500,
    description: 'coffee',
    direction: 'debit',
  });
  await insertTransaction(serviceDb, {
    accountId: accountA.id,
    amountCents: 50,
    description: 'coffee',
    direction: 'debit',
  });
  await insertTransaction(serviceDb, {
    accountId: accountA.id,
    amountCents: 500,
    description: 'coffee',
    direction: 'credit',
  });

  const result = await previewMatchMerchantRuleService(
    asDb(serviceDb),
    user.id,
    {
      accountId: accountA.id,
      amountMinCents: 100,
      amountOp: 'gte',
      direction: 'debit',
      kind: 'contains',
      value: 'coffee',
    },
  );

  expect(result.count).toBe(1);
  expect(result.sample[0].accountName).toBe(accountA.name);
});

test('preview-match — isolates across users', async ({ serviceDb }) => {
  const userA = await insertUser(serviceDb);
  const userB = await insertUser(serviceDb);
  const accountA = await insertLedgerAccount(serviceDb, { userId: userA.id });
  const accountB = await insertLedgerAccount(serviceDb, { userId: userB.id });

  await insertTransaction(serviceDb, {
    accountId: accountA.id,
    description: 'coffee',
  });
  await insertTransaction(serviceDb, {
    accountId: accountB.id,
    description: 'coffee',
  });

  const result = await previewMatchMerchantRuleService(
    asDb(serviceDb),
    userA.id,
    { kind: 'contains', value: 'coffee' },
  );

  expect(result.count).toBe(1);
  expect(result.sample[0].accountName).toBe(accountA.name);
});

test('preview-match — returns zero count + empty sample when nothing matches', async ({
  serviceDb,
}) => {
  const { user } = await setup(serviceDb);

  const result = await previewMatchMerchantRuleService(
    asDb(serviceDb),
    user.id,
    { kind: 'contains', value: 'never-matches' },
  );

  expect(result.count).toBe(0);
  expect(result.sample).toStrictEqual([]);
});

test('preview-match — regex kind uses ~* operator (case-insensitive)', async ({
  serviceDb,
}) => {
  const { account, user } = await setup(serviceDb);
  await insertTransaction(serviceDb, {
    accountId: account.id,
    description: 'AMZN#123',
  });
  await insertTransaction(serviceDb, {
    accountId: account.id,
    description: 'other AMZN',
  });

  const result = await previewMatchMerchantRuleService(
    asDb(serviceDb),
    user.id,
    { kind: 'regex', value: '^AMZN' },
  );

  expect(result.count).toBe(1);
  expect(result.sample[0].description).toBe('AMZN#123');
});

test('preview-match — caps sample at 20 rows', async ({ serviceDb }) => {
  const { account, user } = await setup(serviceDb);

  const rowPromises: Promise<unknown>[] = [];
  for (let i = 0; i < 30; i++) {
    rowPromises.push(
      insertTransaction(serviceDb, {
        accountId: account.id,
        description: `match-${i}`,
      }),
    );
  }
  await Promise.all(rowPromises);

  const result = await previewMatchMerchantRuleService(
    asDb(serviceDb),
    user.id,
    { kind: 'contains', value: 'match-' },
  );

  expect(result.count).toBe(30);
  expect(result.sample).toHaveLength(20);
});
