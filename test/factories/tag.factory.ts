import { faker } from '@faker-js/faker';

import type { Tag, TagInsert } from '@/modules/transactions/models';

import { tags } from '@/db/schema';
import { type Db, fakeDate, fakeId } from '~test/factories/base';

const TAG_NAMES = [
  'business',
  'deductible',
  'personal',
  'recurring',
  'reimbursable',
  'subscription',
  'travel',
  'urgent',
];

export function createTag(overrides?: Partial<Tag>): Tag {
  const now = fakeDate();
  return {
    createdAt: now,
    createdById: null,
    deletedAt: null,
    deletedById: null,
    id: fakeId(),
    name: faker.helpers.arrayElement(TAG_NAMES),
    updatedAt: now,
    updatedById: null,
    userId: fakeId(),
    ...overrides,
  };
}

export async function insertTag(
  db: Db,
  overrides: Pick<TagInsert, 'userId'> & Partial<TagInsert>,
): Promise<Tag> {
  const data: TagInsert = {
    name: `${faker.helpers.arrayElement(TAG_NAMES)}-${faker.string.nanoid(6)}`,
    ...overrides,
  };
  const [row] = await db.insert(tags).values(data).returning();
  return row;
}
