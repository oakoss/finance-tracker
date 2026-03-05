import { createServerFn } from '@tanstack/react-start';

import { db } from '@/db';
import { arkValidator } from '@/lib/form/validation';
import { log } from '@/lib/logging/evlog';
import { hashId } from '@/lib/logging/hash';
import { handleServerFnError } from '@/lib/server-fn/handle-error';
import { authMiddleware, requireUserId } from '@/modules/auth/middleware';
import { deleteCategoryService } from '@/modules/categories/services/delete-category';
import { deleteCategorySchema } from '@/modules/categories/validators';

export const deleteCategory = createServerFn({ method: 'POST' })
  .inputValidator(arkValidator(deleteCategorySchema))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const userId = requireUserId(context);

    try {
      await deleteCategoryService(db, userId, data);

      log.info({
        action: 'category.delete',
        outcome: { idHash: hashId(data.id) },
        user: { idHash: hashId(userId) },
      });

      return { success: true };
    } catch (error) {
      handleServerFnError(error, {
        action: 'category.delete',
        fix: 'Try again or contact support.',
        message: 'Failed to delete category.',
        userId,
      });
    }
  });
