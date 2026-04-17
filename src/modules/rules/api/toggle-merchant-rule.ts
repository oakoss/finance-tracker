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
import { toggleMerchantRuleService } from '@/modules/rules/services/toggle-merchant-rule';
import { toggleMerchantRuleSchema } from '@/modules/rules/validators';

export const toggleMerchantRule = createServerFn({ method: 'POST' })
  .inputValidator(arkValidator(toggleMerchantRuleSchema))
  .middleware([verifiedMutationMiddleware])
  .handler(async ({ context, data }) => {
    const userId = requireUserId(context);

    try {
      const result = await toggleMerchantRuleService(db, userId, data);

      log.info({
        action: 'merchantRule.toggle',
        outcome: { idHash: hashId(result.id), isActive: result.isActive },
        user: { idHash: hashId(userId) },
      });

      return result;
    } catch (error) {
      handleServerFnError(error, {
        action: 'merchantRule.toggle',
        fix: 'Try again. If the problem persists, contact support.',
        message: 'Failed to toggle merchant rule.',
        userId,
      });
    }
  });
