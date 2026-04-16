import type { RuleRun, RuleRunInsert } from '@/modules/rules/models';

import { ruleRuns } from '@/db/schema';
import { type Db, fakeDate, fakeId } from '~test/factories/base';

export function createRuleRun(overrides?: Partial<RuleRun>): RuleRun {
  const now = fakeDate();
  return {
    affectedTransactionIds: [],
    createdAt: now,
    createdById: null,
    deletedAt: null,
    deletedById: null,
    id: fakeId(),
    ruleId: fakeId(),
    runAt: now,
    undoableUntil: new Date(now.getTime() + 5 * 60 * 1000),
    undoData: { transactions: [] },
    undoneAt: null,
    updatedAt: now,
    updatedById: null,
    ...overrides,
  };
}

export async function insertRuleRun(
  db: Db,
  overrides: Pick<RuleRunInsert, 'ruleId'> & Partial<RuleRunInsert>,
): Promise<RuleRun> {
  const data: RuleRunInsert = { undoData: { transactions: [] }, ...overrides };
  const [row] = await db.insert(ruleRuns).values(data).returning();
  return row;
}
