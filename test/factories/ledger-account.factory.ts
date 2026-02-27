import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';

import { faker } from '@faker-js/faker';

import { ledgerAccounts } from '@/db/schema';
import { type Db, fakeDate, fakeId } from '~test/factories/base';

type LedgerAccount = InferSelectModel<typeof ledgerAccounts>;
type LedgerAccountInsert = InferInsertModel<typeof ledgerAccounts>;

const ACCOUNT_TYPES = [
  'checking',
  'savings',
  'credit_card',
  'loan',
  'cash',
  'investment',
  'other',
] as const;

export function createLedgerAccount(
  overrides?: Partial<LedgerAccount>,
): LedgerAccount {
  const now = fakeDate();
  return {
    accountNumberMask: faker.finance.accountNumber(4),
    closedAt: null,
    createdAt: now,
    createdById: null,
    creditCardCatalogId: null,
    currency: 'USD',
    deletedAt: null,
    deletedById: null,
    id: fakeId(),
    institution: faker.company.name(),
    name: faker.finance.accountName(),
    openedAt: now,
    ownerType: 'personal',
    status: 'active',
    type: faker.helpers.arrayElement(ACCOUNT_TYPES),
    updatedAt: now,
    updatedById: null,
    userId: fakeId(),
    ...overrides,
  };
}

export async function insertLedgerAccount(
  db: Db,
  overrides: Pick<LedgerAccountInsert, 'userId'> & Partial<LedgerAccountInsert>,
): Promise<LedgerAccount> {
  const data: LedgerAccountInsert = {
    currency: 'USD',
    name: faker.finance.accountName(),
    type: faker.helpers.arrayElement(ACCOUNT_TYPES),
    ...overrides,
  };
  const [row] = await db.insert(ledgerAccounts).values(data).returning();
  return row;
}
