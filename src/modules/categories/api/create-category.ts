import { createServerFn } from '@tanstack/react-start';

import { db } from '@/db';
import { insertAuditLog } from '@/lib/audit/insert-audit-log';
import { notDeleted } from '@/lib/audit/soft-delete';
import { createError, log } from '@/lib/logging/evlog';
import { hashId } from '@/lib/logging/hash';
import { arkValidator, isExpectedError, toError } from '@/lib/validation';
import { authMiddleware, requireUserId } from '@/modules/auth/middleware';
import { createCategorySchema } from '@/modules/categories/types';
import { categories } from '@/modules/finance/db/schema';

export const createCategory = createServerFn({ method: 'POST' })
  .inputValidator(arkValidator(createCategorySchema))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const userId = requireUserId(context);

    try {
      const result = await db.transaction(async (tx) => {
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

      log.info({
        action: 'category.create',
        outcome: { idHash: hashId(result.id) },
        user: { idHash: hashId(userId) },
      });

      return result;
    } catch (error) {
      if (isExpectedError(error)) throw error;
      log.error({
        action: 'category.create',
        error: toError(error).message,
        outcome: { success: false },
        user: { idHash: hashId(userId) },
      });
      throw createError({
        cause: toError(error),
        fix: 'Try again. If the problem persists, contact support.',
        message: 'Failed to create category.',
        status: 500,
      });
    }
  });
