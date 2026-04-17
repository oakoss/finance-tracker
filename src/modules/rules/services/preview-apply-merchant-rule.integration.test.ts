import { eq } from 'drizzle-orm';
import { expect } from 'vitest';

import type { Db } from '@/db';

import { merchantRules } from '@/modules/rules/db/schema';
import { previewApplyMerchantRuleService } from '@/modules/rules/services/preview-apply-merchant-rule';
import { transactions } from '@/modules/transactions/db/schema';
import type { Db as TestDb } from '~test/factories/base';
import { insertLedgerAccount } from '~test/factories/ledger-account.factory';
import { insertMerchantRule } from '~test/factories/merchant-rule.factory';
import { insertTransaction } from '~test/factories/transaction.factory';
import { insertUser } from '~test/factories/user.factory';
import { test } from '~test/integration-setup';

const asDb = (db: TestDb) => db as unknown as Db;

async function setupUserWithAccount(db: TestDb) {
  const user = await insertUser(db);
  const account = await insertLedgerAccount(db, { userId: user.id });
  return { account, user };
}

test('preview — contains matches descriptions case-insensitively', async ({
  serviceDb,
}) => {
  const { account, user } = await setupUserWithAccount(serviceDb);

  await insertTransaction(serviceDb, {
    accountId: account.id,
    description: 'AMZN Marketplace',
  });
  await insertTransaction(serviceDb, {
    accountId: account.id,
    description: 'Other merchant',
  });

  const rule = await insertMerchantRule(serviceDb, {
    match: { kind: 'contains', value: 'amzn' },
    userId: user.id,
  });

  const result = await previewApplyMerchantRuleService(
    asDb(serviceDb),
    user.id,
    { id: rule.id },
  );

  expect(result.count).toBe(1);
  expect(result.sample[0].description).toBe('AMZN Marketplace');
});

test('preview — starts_with and ends_with', async ({ serviceDb }) => {
  const { account, user } = await setupUserWithAccount(serviceDb);

  await insertTransaction(serviceDb, {
    accountId: account.id,
    description: 'Amazon Prime',
  });
  await insertTransaction(serviceDb, {
    accountId: account.id,
    description: 'Refund from Amazon',
  });

  const startsRule = await insertMerchantRule(serviceDb, {
    match: { kind: 'starts_with', value: 'Amazon' },
    userId: user.id,
  });
  const endsRule = await insertMerchantRule(serviceDb, {
    match: { kind: 'ends_with', value: 'Amazon' },
    userId: user.id,
  });

  const starts = await previewApplyMerchantRuleService(
    asDb(serviceDb),
    user.id,
    { id: startsRule.id },
  );
  const ends = await previewApplyMerchantRuleService(asDb(serviceDb), user.id, {
    id: endsRule.id,
  });

  expect(starts.count).toBe(1);
  expect(starts.sample[0].description).toBe('Amazon Prime');
  expect(ends.count).toBe(1);
  expect(ends.sample[0].description).toBe('Refund from Amazon');
});

test('preview — exact matches whole description (case-insensitive)', async ({
  serviceDb,
}) => {
  const { account, user } = await setupUserWithAccount(serviceDb);

  await insertTransaction(serviceDb, {
    accountId: account.id,
    description: 'STARBUCKS',
  });
  await insertTransaction(serviceDb, {
    accountId: account.id,
    description: 'STARBUCKS COFFEE',
  });

  const rule = await insertMerchantRule(serviceDb, {
    match: { kind: 'exact', value: 'starbucks' },
    userId: user.id,
  });

  const result = await previewApplyMerchantRuleService(
    asDb(serviceDb),
    user.id,
    { id: rule.id },
  );

  expect(result.count).toBe(1);
  expect(result.sample[0].description).toBe('STARBUCKS');
});

test('preview — regex matches via Postgres ~* operator', async ({
  serviceDb,
}) => {
  const { account, user } = await setupUserWithAccount(serviceDb);

  await insertTransaction(serviceDb, {
    accountId: account.id,
    description: 'AMZN#123',
  });
  await insertTransaction(serviceDb, {
    accountId: account.id,
    description: 'other AMZN entry',
  });

  const rule = await insertMerchantRule(serviceDb, {
    match: { kind: 'regex', value: '^AMZN' },
    userId: user.id,
  });

  const result = await previewApplyMerchantRuleService(
    asDb(serviceDb),
    user.id,
    { id: rule.id },
  );

  expect(result.count).toBe(1);
  expect(result.sample[0].description).toBe('AMZN#123');
});

test('preview — amount between filters inclusively', async ({ serviceDb }) => {
  const { account, user } = await setupUserWithAccount(serviceDb);

  await insertTransaction(serviceDb, {
    accountId: account.id,
    amountCents: 50,
    description: 'coffee',
  });
  await insertTransaction(serviceDb, {
    accountId: account.id,
    amountCents: 500,
    description: 'coffee',
  });
  await insertTransaction(serviceDb, {
    accountId: account.id,
    amountCents: 2000,
    description: 'coffee',
  });

  const rule = await insertMerchantRule(serviceDb, {
    match: {
      amountMaxCents: 1000,
      amountMinCents: 100,
      amountOp: 'between',
      kind: 'contains',
      value: 'coffee',
    },
    userId: user.id,
  });

  const result = await previewApplyMerchantRuleService(
    asDb(serviceDb),
    user.id,
    { id: rule.id },
  );

  expect(result.count).toBe(1);
  expect(result.sample[0].amountCents).toBe(500);
});

test('preview — amount eq, gte, lte each filter correctly', async ({
  serviceDb,
}) => {
  const { account, user } = await setupUserWithAccount(serviceDb);

  for (const cents of [100, 500, 1000]) {
    await insertTransaction(serviceDb, {
      accountId: account.id,
      amountCents: cents,
      description: 'x',
    });
  }

  const eqRule = await insertMerchantRule(serviceDb, {
    match: {
      amountMinCents: 500,
      amountOp: 'eq',
      kind: 'contains',
      value: 'x',
    },
    userId: user.id,
  });
  const gteRule = await insertMerchantRule(serviceDb, {
    match: {
      amountMinCents: 500,
      amountOp: 'gte',
      kind: 'contains',
      value: 'x',
    },
    userId: user.id,
  });
  const lteRule = await insertMerchantRule(serviceDb, {
    match: {
      amountMaxCents: 500,
      amountOp: 'lte',
      kind: 'contains',
      value: 'x',
    },
    userId: user.id,
  });

  const [eqResult, gteResult, lteResult] = await Promise.all([
    previewApplyMerchantRuleService(asDb(serviceDb), user.id, {
      id: eqRule.id,
    }),
    previewApplyMerchantRuleService(asDb(serviceDb), user.id, {
      id: gteRule.id,
    }),
    previewApplyMerchantRuleService(asDb(serviceDb), user.id, {
      id: lteRule.id,
    }),
  ]);

  expect(eqResult.count).toBe(1);
  expect(gteResult.count).toBe(2);
  expect(lteResult.count).toBe(2);
});

test('preview — direction debit excludes credits and vice versa', async ({
  serviceDb,
}) => {
  const { account, user } = await setupUserWithAccount(serviceDb);

  await insertTransaction(serviceDb, {
    accountId: account.id,
    description: 'coffee',
    direction: 'debit',
  });
  await insertTransaction(serviceDb, {
    accountId: account.id,
    description: 'coffee',
    direction: 'credit',
  });

  const debitRule = await insertMerchantRule(serviceDb, {
    match: { direction: 'debit', kind: 'contains', value: 'coffee' },
    userId: user.id,
  });
  const bothRule = await insertMerchantRule(serviceDb, {
    match: { direction: 'both', kind: 'contains', value: 'coffee' },
    userId: user.id,
  });

  const debit = await previewApplyMerchantRuleService(
    asDb(serviceDb),
    user.id,
    { id: debitRule.id },
  );
  const both = await previewApplyMerchantRuleService(asDb(serviceDb), user.id, {
    id: bothRule.id,
  });

  expect(debit.count).toBe(1);
  expect(debit.sample[0].direction).toBe('debit');
  expect(both.count).toBe(2);
});

test('preview — accountId scopes matches to a single account', async ({
  serviceDb,
}) => {
  const user = await insertUser(serviceDb);
  const accountA = await insertLedgerAccount(serviceDb, { userId: user.id });
  const accountB = await insertLedgerAccount(serviceDb, { userId: user.id });

  await insertTransaction(serviceDb, {
    accountId: accountA.id,
    description: 'coffee',
  });
  await insertTransaction(serviceDb, {
    accountId: accountB.id,
    description: 'coffee',
  });

  const rule = await insertMerchantRule(serviceDb, {
    match: { accountId: accountA.id, kind: 'contains', value: 'coffee' },
    userId: user.id,
  });

  const result = await previewApplyMerchantRuleService(
    asDb(serviceDb),
    user.id,
    { id: rule.id },
  );

  expect(result.count).toBe(1);
  expect(result.sample[0].accountName).toBe(accountA.name);
});

test('preview — isolates across users (does not match other users rows)', async ({
  serviceDb,
}) => {
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

  const rule = await insertMerchantRule(serviceDb, {
    match: { kind: 'contains', value: 'coffee' },
    userId: userA.id,
  });

  const result = await previewApplyMerchantRuleService(
    asDb(serviceDb),
    userA.id,
    { id: rule.id },
  );

  expect(result.count).toBe(1);
  expect(result.sample[0].accountName).toBe(accountA.name);
});

test('preview — caps sample at 50 rows, count reports full total', async ({
  serviceDb,
}) => {
  const { account, user } = await setupUserWithAccount(serviceDb);

  const rowPromises = [];
  for (let i = 0; i < 75; i++) {
    rowPromises.push(
      insertTransaction(serviceDb, {
        accountId: account.id,
        description: `match-${i}`,
      }),
    );
  }
  await Promise.all(rowPromises);

  const rule = await insertMerchantRule(serviceDb, {
    match: { kind: 'contains', value: 'match-' },
    userId: user.id,
  });

  const result = await previewApplyMerchantRuleService(
    asDb(serviceDb),
    user.id,
    { id: rule.id },
  );

  expect(result.count).toBe(75);
  expect(result.sample).toHaveLength(50);
});

test('preview — returns sample ordered by transactionAt DESC', async ({
  serviceDb,
}) => {
  const { account, user } = await setupUserWithAccount(serviceDb);

  const older = new Date('2024-01-01T12:00:00Z');
  const newer = new Date('2024-06-01T12:00:00Z');

  await insertTransaction(serviceDb, {
    accountId: account.id,
    description: 'coffee',
    postedAt: older,
    transactionAt: older,
  });
  await insertTransaction(serviceDb, {
    accountId: account.id,
    description: 'coffee',
    postedAt: newer,
    transactionAt: newer,
  });

  const rule = await insertMerchantRule(serviceDb, {
    match: { kind: 'contains', value: 'coffee' },
    userId: user.id,
  });

  const result = await previewApplyMerchantRuleService(
    asDb(serviceDb),
    user.id,
    { id: rule.id },
  );

  expect(result.sample[0].transactionAt.toISOString()).toBe(
    newer.toISOString(),
  );
  expect(result.sample[1].transactionAt.toISOString()).toBe(
    older.toISOString(),
  );
});

test('preview — does not mutate transactions', async ({ serviceDb }) => {
  const { account, user } = await setupUserWithAccount(serviceDb);
  const tx = await insertTransaction(serviceDb, {
    accountId: account.id,
    description: 'coffee',
  });

  const rule = await insertMerchantRule(serviceDb, {
    match: { kind: 'contains', value: 'coffee' },
    userId: user.id,
  });

  await previewApplyMerchantRuleService(asDb(serviceDb), user.id, {
    id: rule.id,
  });

  const [after] = await serviceDb
    .select()
    .from(transactions)
    .where(eq(transactions.id, tx.id));
  expect(after.updatedAt.getTime()).toBe(tx.updatedAt.getTime());
  expect(after.updatedById).toBeNull();
});

test('preview — rejects non-owner with 404', async ({ serviceDb }) => {
  const user = await insertUser(serviceDb);
  const other = await insertUser(serviceDb);
  const account = await insertLedgerAccount(serviceDb, { userId: user.id });
  const rule = await insertMerchantRule(serviceDb, {
    match: { kind: 'contains', value: 'x' },
    userId: user.id,
  });
  await insertTransaction(serviceDb, {
    accountId: account.id,
    description: 'x',
  });

  await expect(
    previewApplyMerchantRuleService(asDb(serviceDb), other.id, { id: rule.id }),
  ).rejects.toMatchObject({ status: 404 });
});

test('preview — rejects soft-deleted rule with 404', async ({ serviceDb }) => {
  const user = await insertUser(serviceDb);
  const rule = await insertMerchantRule(serviceDb, {
    match: { kind: 'contains', value: 'x' },
    userId: user.id,
  });
  await serviceDb
    .update(merchantRules)
    .set({ deletedAt: new Date() })
    .where(eq(merchantRules.id, rule.id));

  await expect(
    previewApplyMerchantRuleService(asDb(serviceDb), user.id, { id: rule.id }),
  ).rejects.toMatchObject({ status: 404 });
});

test('preview — excludes soft-deleted transactions from both count and sample', async ({
  serviceDb,
}) => {
  const { account, user } = await setupUserWithAccount(serviceDb);
  const active = await insertTransaction(serviceDb, {
    accountId: account.id,
    description: 'coffee',
  });
  const deleted = await insertTransaction(serviceDb, {
    accountId: account.id,
    description: 'coffee',
  });
  await serviceDb
    .update(transactions)
    .set({ deletedAt: new Date() })
    .where(eq(transactions.id, deleted.id));

  const rule = await insertMerchantRule(serviceDb, {
    match: { kind: 'contains', value: 'coffee' },
    userId: user.id,
  });

  const result = await previewApplyMerchantRuleService(
    asDb(serviceDb),
    user.id,
    { id: rule.id },
  );

  expect(result.count).toBe(1);
  expect(result.sample.map((row) => row.id)).toStrictEqual([active.id]);
});
