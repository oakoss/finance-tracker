import { createServerFn } from '@tanstack/react-start';

import { db } from '@/db';
import { arkValidator } from '@/lib/form/validation';
import { log } from '@/lib/logging/evlog';
import { hashId } from '@/lib/logging/hash';
import { handleServerFnError } from '@/lib/server-fn/handle-error';
import {
  requireUserId,
  verifiedMutationMiddleware,
} from '@/modules/auth/middleware';
import { createTagService } from '@/modules/transactions/services/create-tag';
import { createTagSchema } from '@/modules/transactions/validators';

export const createTag = createServerFn({ method: 'POST' })
  .inputValidator(arkValidator(createTagSchema))
  .middleware([verifiedMutationMiddleware])
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
