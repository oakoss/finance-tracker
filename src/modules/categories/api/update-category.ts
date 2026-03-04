import { createServerFn } from '@tanstack/react-start';
import { and, eq } from 'drizzle-orm';

import { db } from '@/db';
import { insertAuditLog } from '@/lib/audit/insert-audit-log';
import { notDeleted } from '@/lib/audit/soft-delete';
import { pgErrorFields, throwIfConstraintViolation } from '@/lib/db/pg-error';
import {
  arkValidator,
  ensureFound,
  isExpectedError,
  toError,
} from '@/lib/form/validation';
import { createError, log } from '@/lib/logging/evlog';
import { hashId } from '@/lib/logging/hash';
import { authMiddleware, requireUserId } from '@/modules/auth/middleware';
import { categories } from '@/modules/categories/db/schema';
import { updateCategorySchema } from '@/modules/categories/validators';

export const updateCategory = createServerFn({ method: 'POST' })
  .inputValidator(arkValidator(updateCategorySchema))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const userId = requireUserId(context);

    try {
      const result = await db.transaction(async (tx) => {
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

      log.info({
        action: 'category.update',
        outcome: { idHash: hashId(result.id) },
        user: { idHash: hashId(userId) },
      });

      return result;
    } catch (error) {
      if (isExpectedError(error)) throw error;
      throwIfConstraintViolation(error, 'category.update', hashId(userId));
      log.error({
        action: 'category.update',
        error: toError(error).message,
        outcome: { success: false },
        user: { idHash: hashId(userId) },
        ...pgErrorFields(error),
      });
      throw createError({
        cause: toError(error),
        fix: 'Try again. If the problem persists, contact support.',
        message: 'Failed to update category.',
        status: 500,
      });
    }
  });
