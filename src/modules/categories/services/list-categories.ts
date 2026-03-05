import { and, asc, eq } from 'drizzle-orm';

import type { Db } from '@/db';

import { notDeleted } from '@/lib/audit/soft-delete';
import { categories } from '@/modules/categories/db/schema';

export async function listCategoriesService(database: Db, userId: string) {
  return database
    .select({
      id: categories.id,
      name: categories.name,
      parentId: categories.parentId,
      type: categories.type,
    })
    .from(categories)
    .where(and(eq(categories.userId, userId), notDeleted(categories.deletedAt)))
    .orderBy(asc(categories.type), asc(categories.name));
}
