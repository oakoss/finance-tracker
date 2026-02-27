import { faker } from '@faker-js/faker';
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';

import { accountBalanceSnapshots } from '@/db/schema';
import { type Db, fakeCents, fakeDate, fakeId } from '~test/factories/base';

type AccountBalanceSnapshot = InferSelectModel<typeof accountBalanceSnapshots>;
type AccountBalanceSnapshotInsert = InferInsertModel<
  typeof accountBalanceSnapshots
>;

export function createAccountBalanceSnapshot(
  overrides?: Partial<AccountBalanceSnapshot>,
): AccountBalanceSnapshot {
  const now = fakeDate();
  return {
    accountId: fakeId(),
    balanceCents: fakeCents(),
    createdAt: now,
    createdById: null,
    deletedAt: null,
    deletedById: null,
    id: fakeId(),
    recordedAt: now,
    source: faker.helpers.arrayElement(['manual', 'import']),
    updatedAt: now,
    updatedById: null,
    ...overrides,
  };
}

export async function insertAccountBalanceSnapshot(
  db: Db,
  overrides: Pick<AccountBalanceSnapshotInsert, 'accountId'> &
    Partial<AccountBalanceSnapshotInsert>,
): Promise<AccountBalanceSnapshot> {
  const data: AccountBalanceSnapshotInsert = {
    balanceCents: fakeCents(),
    recordedAt: faker.date.recent(),
    source: 'manual',
    ...overrides,
  };
  const [row] = await db
    .insert(accountBalanceSnapshots)
    .values(data)
    .returning();
  return row;
}
