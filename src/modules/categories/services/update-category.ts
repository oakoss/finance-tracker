import { and, eq } from 'drizzle-orm';

import type { Db } from '@/db';
import type { UpdateCategoryInput } from '@/modules/categories/validators';

import { insertAuditLog } from '@/lib/audit/insert-audit-log';
import { notDeleted } from '@/lib/audit/soft-delete';
import { ensureFound } from '@/lib/form/validation';
import { createError } from '@/lib/logging/evlog';
import { categories } from '@/modules/categories/db/schema';

export async function updateCategoryService(
  database: Db,
  userId: string,
  data: UpdateCategoryInput,
) {
  return database.transaction(async (tx) => {
    const { id, ...fields } = data;

    const existing = await ensureFound(
      tx.query.categories.findFirst({
        where: (t, { and: a, eq: e }) =>
          a(e(t.id, id), e(t.userId, userId), notDeleted(t.deletedAt)),
      }),
      'Category',
    );

    if (fields.parentId !== undefined && fields.parentId !== null) {
      if (fields.parentId === id) {
        throw createError({
          fix: 'Select a different parent category.',
          message: 'A category cannot be its own parent.',
          status: 422,
        });
      }

      const parent = await tx.query.categories.findFirst({
        where: (t, { and: a, eq: e }) =>
          a(
            e(t.id, fields.parentId!),
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

    const [updated] = await tx
      .update(categories)
      .set({
        ...fields,
        updatedById: userId,
      })
      .where(
        and(
          eq(categories.id, id),
          eq(categories.userId, userId),
          notDeleted(categories.deletedAt),
        ),
      )
      .returning();

    if (!updated) {
      throw createError({
        fix: 'Refresh the page. This category may have been deleted.',
        message: 'Category not found.',
        status: 409,
      });
    }

    await insertAuditLog(tx, {
      action: 'update',
      actorId: userId,
      afterData: updated as unknown as Record<string, unknown>,
      beforeData: existing as unknown as Record<string, unknown>,
      entityId: id,
      tableName: 'categories',
    });

    return updated;
  });
}
