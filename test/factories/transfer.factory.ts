import type {
  Transfer,
  TransferConfidence,
  TransferInsert,
} from '@/modules/transfers/models';

import { transfers } from '@/db/schema';
import { type Db, fakeDate, fakeId } from '~test/factories/base';

const DEFAULT_CONFIDENCE: TransferConfidence = 'manual';

export function createTransfer(overrides?: Partial<Transfer>): Transfer {
  const now = fakeDate();
  return {
    confidence: DEFAULT_CONFIDENCE,
    createdAt: now,
    createdById: null,
    deletedAt: null,
    deletedById: null,
    detectedByRuleId: null,
    fromTransactionId: fakeId(),
    id: fakeId(),
    toTransactionId: fakeId(),
    updatedAt: now,
    updatedById: null,
    userId: fakeId(),
    ...overrides,
  };
}

export async function insertTransfer(
  db: Db,
  overrides: Pick<
    TransferInsert,
    'fromTransactionId' | 'toTransactionId' | 'userId'
  > &
    Partial<TransferInsert>,
): Promise<Transfer> {
  const data: TransferInsert = { confidence: DEFAULT_CONFIDENCE, ...overrides };
  const [row] = await db.insert(transfers).values(data).returning();
  return row;
}
