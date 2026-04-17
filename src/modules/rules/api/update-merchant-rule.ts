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
import { updateMerchantRuleService } from '@/modules/rules/services/update-merchant-rule';
import { updateMerchantRuleSchema } from '@/modules/rules/validators';

export const updateMerchantRule = createServerFn({ method: 'POST' })
  .inputValidator(arkValidator(updateMerchantRuleSchema))
  .middleware([verifiedMutationMiddleware])
  .handler(async ({ context, data }) => {
    const userId = requireUserId(context);

    try {
      const result = await updateMerchantRuleService(db, userId, data);

      log.info({
        action: 'merchantRule.update',
        outcome: { idHash: hashId(result.id) },
        user: { idHash: hashId(userId) },
      });

      return result;
    } catch (error) {
      handleServerFnError(error, {
        action: 'merchantRule.update',
        fix: 'Try again. If the problem persists, contact support.',
        message: 'Failed to update merchant rule.',
        userId,
      });
    }
  });
