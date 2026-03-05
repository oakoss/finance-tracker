import { createServerFn } from '@tanstack/react-start';

import { db } from '@/db';
import { arkValidator } from '@/lib/form/validation';
import { log } from '@/lib/logging/evlog';
import { hashId } from '@/lib/logging/hash';
import { handleServerFnError } from '@/lib/server-fn/handle-error';
import { authMiddleware, requireUserId } from '@/modules/auth/middleware';
import { updateCategoryService } from '@/modules/categories/services/update-category';
import { updateCategorySchema } from '@/modules/categories/validators';

export const updateCategory = createServerFn({ method: 'POST' })
  .inputValidator(arkValidator(updateCategorySchema))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const userId = requireUserId(context);

    try {
      const result = await updateCategoryService(db, userId, data);

      log.info({
        action: 'category.update',
        outcome: { idHash: hashId(result.id) },
        user: { idHash: hashId(userId) },
      });

      return result;
    } catch (error) {
      handleServerFnError(error, {
        action: 'category.update',
        fix: 'Try again. If the problem persists, contact support.',
        message: 'Failed to update category.',
        userId,
      });
    }
  });
