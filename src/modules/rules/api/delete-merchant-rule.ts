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
import { deleteMerchantRuleService } from '@/modules/rules/services/delete-merchant-rule';
import { deleteMerchantRuleSchema } from '@/modules/rules/validators';

export const deleteMerchantRule = createServerFn({ method: 'POST' })
  .inputValidator(arkValidator(deleteMerchantRuleSchema))
  .middleware([verifiedMutationMiddleware])
  .handler(async ({ context, data }) => {
    const userId = requireUserId(context);

    try {
      await deleteMerchantRuleService(db, userId, data);

      log.info({
        action: 'merchantRule.delete',
        outcome: { idHash: hashId(data.id) },
        user: { idHash: hashId(userId) },
      });

      return { success: true } as const;
    } catch (error) {
      handleServerFnError(error, {
        action: 'merchantRule.delete',
        fix: 'Try again. If the problem persists, contact support.',
        message: 'Failed to delete merchant rule.',
        userId,
      });
    }
  });
