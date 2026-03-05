import type { Db } from '@/db';
import type { CreateCategoryInput } from '@/modules/categories/validators';

import { insertAuditLog } from '@/lib/audit/insert-audit-log';
import { notDeleted } from '@/lib/audit/soft-delete';
import { createError } from '@/lib/logging/evlog';
import { categories } from '@/modules/categories/db/schema';

export async function createCategoryService(
  database: Db,
  userId: string,
  data: CreateCategoryInput,
) {
  return database.transaction(async (tx) => {
    if (data.parentId) {
      const parent = await tx.query.categories.findFirst({
        where: (t, { and: a, eq: e }) =>
          a(
            e(t.id, data.parentId!),
            e(t.userId, userId),
            notDeleted(t.deletedAt),
          ),
      });

      if (!parent) {
        throw createError({
          fix: 'Select a valid parent category.',
          message: 'Parent category not found.',
          status: 404,
        });
      }
    }

    const [category] = await tx
      .insert(categories)
      .values({
        createdById: userId,
        name: data.name,
        parentId: data.parentId ?? null,
        type: data.type,
        userId,
      })
      .returning();

    if (!category) {
      throw createError({
        fix: 'Try again. If the problem persists, contact support.',
        message: 'Failed to create category.',
        status: 500,
      });
    }

    await insertAuditLog(tx, {
      action: 'create',
      actorId: userId,
      afterData: category as unknown as Record<string, unknown>,
      entityId: category.id,
      tableName: 'categories',
    });

    return category;
  });
}
