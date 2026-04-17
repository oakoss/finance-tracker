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
import { reorderMerchantRulesService } from '@/modules/rules/services/reorder-merchant-rules';
import { reorderMerchantRulesSchema } from '@/modules/rules/validators';

export const reorderMerchantRules = createServerFn({ method: 'POST' })
  .inputValidator(arkValidator(reorderMerchantRulesSchema))
  .middleware([verifiedMutationMiddleware])
  .handler(async ({ context, data }) => {
    const userId = requireUserId(context);

    try {
      await reorderMerchantRulesService(db, userId, data);

      log.info({
        action: 'merchantRule.reorder',
        outcome: { count: data.orderedIds.length, stage: data.stage },
        user: { idHash: hashId(userId) },
      });

      return { success: true } as const;
    } catch (error) {
      handleServerFnError(error, {
        action: 'merchantRule.reorder',
        fix: 'Refresh the page and try again.',
        message: 'Failed to reorder merchant rules.',
        userId,
      });
    }
  });
