import { faker } from '@faker-js/faker';

import type {
  Transaction,
  TransactionInsert,
} from '@/modules/transactions/models';

import { transactions } from '@/db/schema';
import { type Db, fakeCents, fakeDate, fakeId } from '~test/factories/base';

const DESCRIPTIONS = [
  'Amazon Purchase',
  'Coffee Shop',
  'Direct Deposit',
  'Electric Bill',
  'Gas Station',
  'Grocery Store',
  'Monthly Rent',
  'Phone Bill',
  'Restaurant',
  'Streaming Service',
];

export function createTransaction(
  overrides?: Partial<Transaction>,
): Transaction {
  const now = fakeDate();
  return {
    accountId: fakeId(),
    amountCents: fakeCents(),
    balanceCents: null,
    categoryId: null,
    createdAt: now,
    createdById: null,
    currency: null,
    deletedAt: null,
    deletedById: null,
    description: faker.helpers.arrayElement(DESCRIPTIONS),
    direction: faker.helpers.arrayElement(['debit', 'credit']),
    externalId: null,
    fingerprint: null,
    id: fakeId(),
    isSplit: false,
    memo: null,
    payeeId: null,
    payeeNameRaw: null,
    pending: false,
    postedAt: now,
    transactionAt: now,
    transferId: null,
    updatedAt: now,
    updatedById: null,
    ...overrides,
  };
}

export async function insertTransaction(
  db: Db,
  overrides: Pick<TransactionInsert, 'accountId'> & Partial<TransactionInsert>,
): Promise<Transaction> {
  const now = fakeDate();
  const data: TransactionInsert = {
    amountCents: fakeCents(),
    description: faker.helpers.arrayElement(DESCRIPTIONS),
    postedAt: now,
    transactionAt: now,
    ...overrides,
  };
  const [row] = await db.insert(transactions).values(data).returning();
  return row;
}
