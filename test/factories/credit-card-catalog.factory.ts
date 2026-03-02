import { faker } from '@faker-js/faker';

import {
  creditCardCatalog,
  type creditCardCatalogInsertSchema,
  type creditCardCatalogSelectSchema,
} from '@/db/schema';
import { type Db, fakeDate, fakeId } from '~test/factories/base';

type CreditCardCatalog = typeof creditCardCatalogSelectSchema.infer;
type CreditCardCatalogInsert = typeof creditCardCatalogInsertSchema.infer;

export function createCreditCardCatalog(
  overrides?: Partial<CreditCardCatalog>,
): CreditCardCatalog {
  const now = fakeDate();
  return {
    annualFeeCents: faker.number.int({ max: 55_000, min: 0 }),
    balanceTransferFeeBps: 300,
    cashAdvanceAprBps: 2499,
    createdAt: now,
    createdById: null,
    defaultAprBps: faker.number.int({ max: 2999, min: 1000 }),
    deletedAt: null,
    deletedById: null,
    foreignTransactionFeeBps: 300,
    id: fakeId(),
    issuer: faker.company.name(),
    name: faker.finance.creditCardIssuer(),
    network: faker.helpers.arrayElement(['Visa', 'Mastercard', 'Amex']),
    promoNotes: null,
    rewardsType: faker.helpers.arrayElement(['cashback', 'points', 'miles']),
    updatedAt: now,
    updatedById: null,
    ...overrides,
  };
}

export async function insertCreditCardCatalog(
  db: Db,
  overrides?: Partial<CreditCardCatalogInsert>,
): Promise<CreditCardCatalog> {
  const data: CreditCardCatalogInsert = {
    issuer: faker.company.name(),
    name: faker.finance.creditCardIssuer(),
    ...overrides,
  };
  const [row] = await db.insert(creditCardCatalog).values(data).returning();
  return row;
}
