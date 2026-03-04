import { faker } from '@faker-js/faker';

import type {
  AccountTerms,
  AccountTermsInsert,
} from '@/modules/accounts/models';

import { accountTerms } from '@/db/schema';
import { type Db, fakeDate, fakeId } from '~test/factories/base';

export function createAccountTerms(
  overrides?: Partial<AccountTerms>,
): AccountTerms {
  const now = fakeDate();
  return {
    accountId: fakeId(),
    aprBps: faker.number.int({ max: 3000, min: 500 }),
    createdAt: now,
    createdById: null,
    deletedAt: null,
    deletedById: null,
    dueDay: faker.number.int({ max: 28, min: 1 }),
    id: fakeId(),
    minPaymentType: 'percentage',
    minPaymentValue: 200,
    statementDay: faker.number.int({ max: 28, min: 1 }),
    updatedAt: now,
    updatedById: null,
    ...overrides,
  };
}

export async function insertAccountTerms(
  db: Db,
  overrides: Pick<AccountTermsInsert, 'accountId'> &
    Partial<AccountTermsInsert>,
): Promise<AccountTerms> {
  const data: AccountTermsInsert = {
    aprBps: faker.number.int({ max: 3000, min: 500 }),
    dueDay: faker.number.int({ max: 28, min: 1 }),
    statementDay: faker.number.int({ max: 28, min: 1 }),
    ...overrides,
  };
  const [row] = await db.insert(accountTerms).values(data).returning();
  return row;
}
