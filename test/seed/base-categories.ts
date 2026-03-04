import { and, eq } from 'drizzle-orm';

import type { Category } from '@/modules/categories/models';
import type { Db } from '~test/factories/base';

import { categories, type categoryTypeEnum } from '@/db/schema';

type CategoryType = (typeof categoryTypeEnum.enumValues)[number];

type CategoryDef = {
  children?: [string, ...string[]];
  name: string;
  type: CategoryType;
};

const CATEGORY_TREE: CategoryDef[] = [
  {
    children: [
      'Rent/Mortgage',
      'Utilities',
      'Home Insurance',
      'Home Maintenance',
    ],
    name: 'Housing',
    type: 'expense',
  },
  {
    children: ['Gas', 'Public Transit', 'Auto Insurance', 'Car Maintenance'],
    name: 'Transportation',
    type: 'expense',
  },
  {
    children: ['Groceries', 'Dining Out', 'Coffee'],
    name: 'Food',
    type: 'expense',
  },
  {
    children: ['Doctor', 'Pharmacy', 'Health Insurance'],
    name: 'Healthcare',
    type: 'expense',
  },
  {
    children: ['Streaming', 'Hobbies', 'Events'],
    name: 'Entertainment',
    type: 'expense',
  },
  {
    children: ['Clothing', 'Electronics', 'Home Goods'],
    name: 'Shopping',
    type: 'expense',
  },
  {
    children: ['Haircut', 'Gym', 'Subscriptions'],
    name: 'Personal',
    type: 'expense',
  },
  {
    children: ['Tuition', 'Books', 'Courses'],
    name: 'Education',
    type: 'expense',
  },
  { name: 'Gifts & Donations', type: 'expense' },
  { name: 'Salary', type: 'income' },
  { name: 'Freelance', type: 'income' },
  { name: 'Investment', type: 'income' },
  { name: 'Refund', type: 'income' },
  { name: 'Other Income', type: 'income' },
  { name: 'Transfer', type: 'transfer' },
];

export async function seedBaseCategories(
  db: Db,
  userId: string,
): Promise<Category[]> {
  const all: Category[] = [];

  for (const def of CATEGORY_TREE) {
    const [inserted] = await db
      .insert(categories)
      .values({ name: def.name, type: def.type, userId })
      .onConflictDoNothing()
      .returning();

    let parent = inserted;
    if (!parent) {
      const existing = await db
        .select()
        .from(categories)
        .where(
          and(eq(categories.userId, userId), eq(categories.name, def.name)),
        )
        .limit(1);
      parent = existing[0];
    }

    if (!parent) {
      throw new Error(
        `Failed to resolve category "${def.name}" for user ${userId}`,
      );
    }

    if (inserted) all.push(parent);

    if (def.children) {
      const children = await db
        .insert(categories)
        .values(
          def.children.map((name) => ({
            name,
            parentId: parent.id,
            type: def.type,
            userId,
          })),
        )
        .onConflictDoNothing()
        .returning();
      all.push(...children);
    }
  }

  console.log(`Seeded ${all.length} categories for user ${userId}`);
  return all;
}
