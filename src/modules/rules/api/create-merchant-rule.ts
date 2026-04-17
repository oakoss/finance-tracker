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
import { createMerchantRuleService } from '@/modules/rules/services/create-merchant-rule';
import { createMerchantRuleSchema } from '@/modules/rules/validators';

export const createMerchantRule = createServerFn({ method: 'POST' })
  .inputValidator(arkValidator(createMerchantRuleSchema))
  .middleware([verifiedMutationMiddleware])
  .handler(async ({ context, data }) => {
    const userId = requireUserId(context);

    try {
      const result = await createMerchantRuleService(db, userId, data);

      log.info({
        action: 'merchantRule.create',
        outcome: { idHash: hashId(result.id) },
        user: { idHash: hashId(userId) },
      });

      return result;
    } catch (error) {
      handleServerFnError(error, {
        action: 'merchantRule.create',
        fix: 'Try again. If the problem persists, contact support.',
        message: 'Failed to create merchant rule.',
        userId,
      });
    }
  });
