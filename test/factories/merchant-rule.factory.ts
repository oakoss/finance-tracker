import { faker } from '@faker-js/faker';

import type { MerchantRule, MerchantRuleInsert } from '@/modules/rules/models';

import { merchantRules } from '@/db/schema';
import { type Db, fakeDate, fakeId } from '~test/factories/base';

export function createMerchantRule(
  overrides?: Partial<MerchantRule>,
): MerchantRule {
  const now = fakeDate();
  return {
    actions: [{ categoryId: fakeId(), kind: 'setCategory' }],
    createdAt: now,
    createdById: null,
    deletedAt: null,
    deletedById: null,
    id: fakeId(),
    isActive: true,
    match: { kind: 'contains', value: faker.company.name() },
    priority: 0,
    stage: 'default',
    updatedAt: now,
    updatedById: null,
    userId: fakeId(),
    ...overrides,
  };
}

export async function insertMerchantRule(
  db: Db,
  overrides: Pick<MerchantRuleInsert, 'userId'> & Partial<MerchantRuleInsert>,
): Promise<MerchantRule> {
  const data: MerchantRuleInsert = {
    actions: [{ categoryId: fakeId(), kind: 'setCategory' }],
    match: { kind: 'contains', value: faker.company.name() },
    ...overrides,
  };
  const [row] = await db.insert(merchantRules).values(data).returning();
  return row;
}
