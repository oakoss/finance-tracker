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
import { undoRuleRunService } from '@/modules/rules/services/undo-rule-run';
import { undoRuleRunSchema } from '@/modules/rules/validators';

export const undoRuleRun = createServerFn({ method: 'POST' })
  .inputValidator(arkValidator(undoRuleRunSchema))
  .middleware([verifiedMutationMiddleware])
  .handler(async ({ context, data }) => {
    const userId = requireUserId(context);

    try {
      const result = await undoRuleRunService(db, userId, data);

      log.info({
        action: 'ruleRun.undo',
        outcome: {
          restoredCount: result.restoredCount,
          runIdHash: hashId(result.runId),
        },
        user: { idHash: hashId(userId) },
      });

      return result;
    } catch (error) {
      handleServerFnError(error, {
        action: 'ruleRun.undo',
        fix: 'Refresh the page and try again.',
        message: 'Failed to undo rule run.',
        userId,
      });
    }
  });
