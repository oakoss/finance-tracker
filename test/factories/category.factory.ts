import { faker } from '@faker-js/faker';
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';

import { categories } from '@/db/schema';
import { type Db, fakeDate, fakeId } from '~test/factories/base';

type Category = InferSelectModel<typeof categories>;
type CategoryInsert = InferInsertModel<typeof categories>;

const CATEGORY_TYPES = ['income', 'expense', 'transfer'] as const;

const EXPENSE_CATEGORIES = [
  'Groceries',
  'Dining Out',
  'Transportation',
  'Entertainment',
  'Utilities',
  'Healthcare',
  'Shopping',
  'Education',
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
