import { and, eq } from 'drizzle-orm';

import type { Db } from '@/db';
import type { DeleteCategoryInput } from '@/modules/categories/validators';

import { insertAuditLog } from '@/lib/audit/insert-audit-log';
import { notDeleted } from '@/lib/audit/soft-delete';
import { ensureFound } from '@/lib/form/validation';
import { createError } from '@/lib/logging/evlog';
import { categories } from '@/modules/categories/db/schema';

export async function deleteCategoryService(
  database: Db,
  userId: string,
  data: DeleteCategoryInput,
) {
  return database.transaction(async (tx) => {
    const existing = await ensureFound(
      tx.query.categories.findFirst({
        where: (t, { and: a, eq: e }) =>
          a(e(t.id, data.id), e(t.userId, userId), notDeleted(t.deletedAt)),
      }),
      'Category',
    );

    const now = new Date();

    const [deleted] = await tx
      .update(categories)
      .set({
        deletedAt: now,
        deletedById: userId,
      })
      .where(
        and(
          eq(categories.id, data.id),
          eq(categories.userId, userId),
          notDeleted(categories.deletedAt),
        ),
      )
      .returning();

    if (!deleted) {
      throw createError({
        fix: 'Refresh the page. This category may have already been deleted.',
        message: 'Category not found.',
        status: 409,
      });
    }

    // Nullify parentId on children of deleted category
    await tx
      .update(categories)
      .set({
        parentId: null,
        updatedById: userId,
      })
      .where(
        and(
          eq(categories.parentId, data.id),
          eq(categories.userId, userId),
          notDeleted(categories.deletedAt),
        ),
      );

    await insertAuditLog(tx, {
      action: 'delete',
      actorId: userId,
      beforeData: existing as unknown as Record<string, unknown>,
      entityId: data.id,
      tableName: 'categories',
    });
  });
}
