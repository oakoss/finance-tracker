import { faker } from '@faker-js/faker';

import {
  payees,
  type payeesInsertSchema,
  type payeesSelectSchema,
} from '@/db/schema';
import { type Db, fakeDate, fakeId } from '~test/factories/base';

type Payee = typeof payeesSelectSchema.infer;
type PayeeInsert = typeof payeesInsertSchema.infer;

export function createPayee(overrides?: Partial<Payee>): Payee {
  const now = fakeDate();
  return {
    createdAt: now,
    createdById: null,
    deletedAt: null,
    deletedById: null,
    id: fakeId(),
    name: faker.company.name(),
    normalizedName: null,
    updatedAt: now,
    updatedById: null,
    userId: fakeId(),
    ...overrides,
  };
}

export async function insertPayee(
  db: Db,
  overrides: Pick<PayeeInsert, 'userId'> & Partial<PayeeInsert>,
): Promise<Payee> {
  const data: PayeeInsert = {
    name: `${faker.company.name()}-${faker.string.nanoid(6)}`,
    ...overrides,
  };
  const [row] = await db.insert(payees).values(data).returning();
  return row;
}
