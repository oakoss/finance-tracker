import { type } from 'arktype';
import { and, asc, eq } from 'drizzle-orm';

import type { Db } from '@/db';

import { notDeleted } from '@/lib/audit/soft-delete';
import { createError, log } from '@/lib/logging/evlog';
import { hashId } from '@/lib/logging/hash';
import { merchantRules } from '@/modules/rules/db/schema';
import {
  matchPredicateSchema,
  type MerchantRule,
  ruleActionsSchema,
} from '@/modules/rules/models';

export async function listMerchantRulesService(
  database: Db,
  userId: string,
): Promise<MerchantRule[]> {
  const rows = await database
    .select()
    .from(merchantRules)
    .where(
      and(
        eq(merchantRules.userId, userId),
        notDeleted(merchantRules.deletedAt),
      ),
    )
    .orderBy(asc(merchantRules.stage), asc(merchantRules.priority));

  for (const row of rows) {
    const match = matchPredicateSchema(row.match);
    const actions = ruleActionsSchema(row.actions);
    const matchErr = match instanceof type.errors ? match.summary : null;
    const actionsErr = actions instanceof type.errors ? actions.summary : null;
    if (matchErr !== null || actionsErr !== null) {
      const ruleIdHash = hashId(row.id);
      log.error({
        action: 'merchantRule.list',
        outcome: {
          actionsErr,
          matchErr,
          reason: 'corrupt_row',
          ruleIdHash,
          success: false,
        },
        user: { idHash: hashId(userId) },
      });
      throw createError({
        fix: `Contact support with rule reference ${ruleIdHash.slice(0, 12)}.`,
        message: 'Merchant rule stored in unreadable state.',
        status: 500,
      });
    }
  }

  return rows;
}
