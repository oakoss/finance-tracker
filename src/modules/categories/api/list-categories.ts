import { createServerFn } from '@tanstack/react-start';

import { db } from '@/db';
import { log } from '@/lib/logging/evlog';
import { hashId } from '@/lib/logging/hash';
import { handleServerFnError } from '@/lib/server-fn/handle-error';
import { authMiddleware, requireUserId } from '@/modules/auth/middleware';
import { listCategoriesService } from '@/modules/categories/services/list-categories';

export const listCategories = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const userId = requireUserId(context);

    try {
      const result = await listCategoriesService(db, userId);

      log.info({
        action: 'category.list',
        outcome: { count: result.length },
        user: { idHash: hashId(userId) },
      });

      return result;
    } catch (error) {
      handleServerFnError(error, {
        action: 'category.list',
        fix: 'Refresh the page. If the problem persists, contact support.',
        message: 'Failed to list categories.',
        userId,
      });
    }
  });

export type CategoryListItem = Awaited<
  ReturnType<typeof listCategories>
>[number];
