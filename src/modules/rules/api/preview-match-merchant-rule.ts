import { createServerFn } from '@tanstack/react-start';

import { db } from '@/db';
import { arkValidator } from '@/lib/form/validation';
import { log } from '@/lib/logging/evlog';
import { hashId } from '@/lib/logging/hash';
import { handleServerFnError } from '@/lib/server-fn/handle-error';
import { authMiddleware, requireUserId } from '@/modules/auth/middleware';
import { previewMatchMerchantRuleService } from '@/modules/rules/services/preview-match-merchant-rule';
import { previewMatchMerchantRuleSchema } from '@/modules/rules/validators';

export const previewMatchMerchantRule = createServerFn({ method: 'GET' })
  .inputValidator(arkValidator(previewMatchMerchantRuleSchema))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const userId = requireUserId(context);

    try {
      const result = await previewMatchMerchantRuleService(db, userId, data);

      log.info({
        action: 'merchantRule.previewMatch',
        outcome: { count: result.count, sampleSize: result.sample.length },
        user: { idHash: hashId(userId) },
      });

      return result;
    } catch (error) {
      handleServerFnError(error, {
        action: 'merchantRule.previewMatch',
        fix: 'Refresh the page and try again.',
        message: 'Failed to preview match.',
        userId,
      });
    }
  });
