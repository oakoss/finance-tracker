import {
  transactionTags,
  type transactionTagsInsertSchema,
  type transactionTagsSelectSchema,
} from '@/modules/transactions/db/schema';
import { type Db, fakeDate, fakeId } from '~test/factories/base';

type TransactionTag = typeof transactionTagsSelectSchema.infer;
type TransactionTagInsert = typeof transactionTagsInsertSchema.infer;

export function createTransactionTag(
  overrides?: Partial<TransactionTag>,
): TransactionTag {
  const now = fakeDate();
  return {
    createdAt: now,
    createdById: null,
    deletedAt: null,
    deletedById: null,
    id: fakeId(),
    tagId: fakeId(),
    transactionId: fakeId(),
    updatedAt: now,
    updatedById: null,
    ...overrides,
  };
}

export async function insertTransactionTag(
  db: Db,
  overrides: Pick<TransactionTagInsert, 'tagId' | 'transactionId'> &
    Partial<TransactionTagInsert>,
): Promise<TransactionTag> {
  const [row] = await db.insert(transactionTags).values(overrides).returning();
  return row;
}
