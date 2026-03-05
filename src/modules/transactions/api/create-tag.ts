import { createServerFn } from '@tanstack/react-start';
import { type } from 'arktype';

import { db } from '@/db';
import { arkValidator } from '@/lib/form/validation';
import { log } from '@/lib/logging/evlog';
import { hashId } from '@/lib/logging/hash';
import { handleServerFnError } from '@/lib/server-fn/handle-error';
import { authMiddleware, requireUserId } from '@/modules/auth/middleware';
import { createTagService } from '@/modules/transactions/services/create-tag';

const createTagSchema = type({
  name: '0 < string <= 100',
});

export const createTag = createServerFn({ method: 'POST' })
  .inputValidator(arkValidator(createTagSchema))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const userId = requireUserId(context);

    try {
      const tag = await createTagService(db, userId, data);

      log.info({
        action: 'tag.create',
        outcome: { idHash: hashId(tag.id) },
        user: { idHash: hashId(userId) },
      });

      return tag;
    } catch (error) {
      handleServerFnError(error, {
        action: 'tag.create',
        fix: 'Try again. If the problem persists, contact support.',
        message: 'Failed to create tag.',
        userId,
      });
    }
  });
