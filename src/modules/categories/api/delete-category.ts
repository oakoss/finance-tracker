import { createServerFn } from '@tanstack/react-start';
import { and, eq } from 'drizzle-orm';

import { db } from '@/db';
import { insertAuditLog } from '@/lib/audit/insert-audit-log';
import { notDeleted } from '@/lib/audit/soft-delete';
import { createError, log } from '@/lib/logging/evlog';
import { hashId } from '@/lib/logging/hash';
import {
  arkValidator,
  ensureFound,
  isExpectedError,
  toError,
} from '@/lib/validation';
import { authMiddleware, requireUserId } from '@/modules/auth/middleware';
import { categories } from '@/modules/categories/db/schema';
import { deleteCategorySchema } from '@/modules/categories/types';

export const deleteCategory = createServerFn({ method: 'POST' })
  .inputValidator(arkValidator(deleteCategorySchema))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const userId = requireUserId(context);

    try {
      await db.transaction(async (tx) => {
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

      log.info({
        action: 'category.delete',
        outcome: { idHash: hashId(data.id) },
        user: { idHash: hashId(userId) },
      });

      return { success: true };
    } catch (error) {
      if (isExpectedError(error)) throw error;
      log.error({
        action: 'category.delete',
        error: toError(error).message,
        outcome: { success: false },
        user: { idHash: hashId(userId) },
      });
      throw createError({
        cause: toError(error),
        fix: 'Try again or contact support.',
        message: 'Failed to delete category.',
        status: 500,
      });
    }
  });
