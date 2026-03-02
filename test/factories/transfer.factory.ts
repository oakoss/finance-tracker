import {
  transfers,
  type transfersInsertSchema,
  type transfersSelectSchema,
} from '@/db/schema';
import { type Db, fakeCents, fakeDate, fakeId } from '~test/factories/base';

type Transfer = typeof transfersSelectSchema.infer;
type TransferInsert = typeof transfersInsertSchema.infer;

export function createTransfer(overrides?: Partial<Transfer>): Transfer {
  const now = fakeDate();
  return {
    amountCents: fakeCents(1000, 50_000),
    createdAt: now,
    createdById: null,
    deletedAt: null,
    deletedById: null,
    fromAccountId: fakeId(),
    id: fakeId(),
    memo: null,
    toAccountId: fakeId(),
    transferAt: now,
    updatedAt: now,
    updatedById: null,
    userId: fakeId(),
    ...overrides,
  };
}

export async function insertTransfer(
  db: Db,
  overrides: Pick<TransferInsert, 'fromAccountId' | 'toAccountId' | 'userId'> &
    Partial<TransferInsert>,
): Promise<Transfer> {
  const data: TransferInsert = {
    amountCents: fakeCents(1000, 50_000),
    transferAt: fakeDate(),
    ...overrides,
  };
  const [row] = await db.insert(transfers).values(data).returning();
  return row;
}
