import { createServerFn } from '@tanstack/react-start';

import { db } from '@/db';
import { log } from '@/lib/logging/evlog';
import { hashId } from '@/lib/logging/hash';
import { handleServerFnError } from '@/lib/server-fn/handle-error';
import { authMiddleware, requireUserId } from '@/modules/auth/middleware';
import { listMerchantRulesService } from '@/modules/rules/services/list-merchant-rules';

export const listMerchantRules = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const userId = requireUserId(context);

    try {
      const result = await listMerchantRulesService(db, userId);

      log.info({
        action: 'merchantRule.list',
        outcome: { count: result.length },
        user: { idHash: hashId(userId) },
      });

      return result;
    } catch (error) {
      handleServerFnError(error, {
        action: 'merchantRule.list',
        fix: 'Refresh the page. If the problem persists, contact support.',
        message: 'Failed to list merchant rules.',
        userId,
      });
    }
  });

export type MerchantRuleListItem = Awaited<
  ReturnType<typeof listMerchantRules>
>[number];
