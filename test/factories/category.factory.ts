import { faker } from '@faker-js/faker';

import {
  categories,
  type categoriesInsertSchema,
  type categoriesSelectSchema,
} from '@/db/schema';
import { type Db, fakeDate, fakeId } from '~test/factories/base';

export type Category = typeof categoriesSelectSchema.infer;
export type CategoryInsert = typeof categoriesInsertSchema.infer;

const CATEGORY_TYPES = ['income', 'expense', 'transfer'] as const;

const EXPENSE_CATEGORIES = [
  'Housing',
  'Transportation',
  'Food',
  'Healthcare',
  'Entertainment',
  'Shopping',
  'Personal',
  'Education',
  'Gifts & Donations',
];

export function createCategory(overrides?: Partial<Category>): Category {
  const now = fakeDate();
  return {
    createdAt: now,
    createdById: null,
    deletedAt: null,
    deletedById: null,
    id: fakeId(),
    name: faker.helpers.arrayElement(EXPENSE_CATEGORIES),
    parentId: null,
    type: faker.helpers.arrayElement(CATEGORY_TYPES),
    updatedAt: now,
    updatedById: null,
    userId: fakeId(),
    ...overrides,
  };
}

export async function insertCategory(
  db: Db,
  overrides: Pick<CategoryInsert, 'userId'> & Partial<CategoryInsert>,
): Promise<Category> {
  const data: CategoryInsert = {
    name: `${faker.helpers.arrayElement(EXPENSE_CATEGORIES)}-${faker.string.nanoid(6)}`,
    type: faker.helpers.arrayElement(CATEGORY_TYPES),
    ...overrides,
  };
  const [row] = await db.insert(categories).values(data).returning();
  return row;
}
