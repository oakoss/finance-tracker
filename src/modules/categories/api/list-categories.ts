import { createServerFn } from '@tanstack/react-start';
import { and, asc, eq } from 'drizzle-orm';

import { db } from '@/db';
import { notDeleted } from '@/lib/audit/soft-delete';
import { createError, log } from '@/lib/logging/evlog';
import { hashId } from '@/lib/logging/hash';
import { isExpectedError, toError } from '@/lib/validation';
import { authMiddleware, requireUserId } from '@/modules/auth/middleware';
import { categories } from '@/modules/categories/db/schema';

export const listCategories = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const userId = requireUserId(context);

    try {
      const rows = await db
        .select({
          id: categories.id,
          name: categories.name,
          parentId: categories.parentId,
          type: categories.type,
        })
        .from(categories)
        .where(
          and(eq(categories.userId, userId), notDeleted(categories.deletedAt)),
        )
        .orderBy(asc(categories.type), asc(categories.name));

      log.info({
        action: 'category.list',
        outcome: { count: rows.length },
        user: { idHash: hashId(userId) },
      });

      return rows;
    } catch (error) {
      if (isExpectedError(error)) throw error;
      log.error({
        action: 'category.list',
        error: toError(error).message,
        outcome: { success: false },
        user: { idHash: hashId(userId) },
      });
      throw createError({
        cause: toError(error),
        fix: 'Refresh the page. If the problem persists, contact support.',
        message: 'Failed to list categories.',
        status: 500,
      });
    }
  });

export type CategoryListItem = Awaited<
  ReturnType<typeof listCategories>
>[number];
