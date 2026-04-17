import { createServerFn } from '@tanstack/react-start';

import { db } from '@/db';
import { arkValidator } from '@/lib/form/validation';
import { log } from '@/lib/logging/evlog';
import { hashId } from '@/lib/logging/hash';
import { handleServerFnError } from '@/lib/server-fn/handle-error';
import { authMiddleware, requireUserId } from '@/modules/auth/middleware';
import { previewApplyMerchantRuleService } from '@/modules/rules/services/preview-apply-merchant-rule';
import { previewApplyMerchantRuleSchema } from '@/modules/rules/validators';

export const previewApplyMerchantRule = createServerFn({ method: 'GET' })
  .inputValidator(arkValidator(previewApplyMerchantRuleSchema))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const userId = requireUserId(context);

    try {
      const result = await previewApplyMerchantRuleService(db, userId, data);

      log.info({
        action: 'merchantRule.previewApply',
        outcome: {
          count: result.count,
          idHash: hashId(data.id),
          sampleSize: result.sample.length,
        },
        user: { idHash: hashId(userId) },
      });

      return result;
    } catch (error) {
      handleServerFnError(error, {
        action: 'merchantRule.previewApply',
        fix: 'Refresh the page and try again.',
        message: 'Failed to preview rule application.',
        userId,
      });
    }
  });
