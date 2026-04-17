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
import { applyMerchantRuleService } from '@/modules/rules/services/apply-merchant-rule';
import { applyMerchantRuleSchema } from '@/modules/rules/validators';

export const applyMerchantRule = createServerFn({ method: 'POST' })
  .inputValidator(arkValidator(applyMerchantRuleSchema))
  .middleware([verifiedMutationMiddleware])
  .handler(async ({ context, data }) => {
    const userId = requireUserId(context);

    try {
      const result = await applyMerchantRuleService(db, userId, data);

      log.info({
        action: 'merchantRule.apply',
        outcome: {
          count: result.count,
          idHash: hashId(data.id),
          runIdHash: hashId(result.runId),
        },
        user: { idHash: hashId(userId) },
      });

      return result;
    } catch (error) {
      handleServerFnError(error, {
        action: 'merchantRule.apply',
        fix: 'Refresh the page and try again.',
        message: 'Failed to apply merchant rule.',
        userId,
      });
    }
  });
