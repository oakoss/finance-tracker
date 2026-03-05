import { createServerFn } from '@tanstack/react-start';

import { db } from '@/db';
import { arkValidator } from '@/lib/form/validation';
import { log } from '@/lib/logging/evlog';
import { hashId } from '@/lib/logging/hash';
import { handleServerFnError } from '@/lib/server-fn/handle-error';
import { authMiddleware, requireUserId } from '@/modules/auth/middleware';
import { createCategoryService } from '@/modules/categories/services/create-category';
import { createCategorySchema } from '@/modules/categories/validators';

export const createCategory = createServerFn({ method: 'POST' })
  .inputValidator(arkValidator(createCategorySchema))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const userId = requireUserId(context);

    try {
      const result = await createCategoryService(db, userId, data);

      log.info({
        action: 'category.create',
        outcome: { idHash: hashId(result.id) },
        user: { idHash: hashId(userId) },
      });

      return result;
    } catch (error) {
      handleServerFnError(error, {
        action: 'category.create',
        fix: 'Try again. If the problem persists, contact support.',
        message: 'Failed to create category.',
        userId,
      });
    }
  });
