import { and, desc, eq } from 'drizzle-orm';

import type { Db } from '@/db';
import type { CreateMerchantRuleInput } from '@/modules/rules/validators';

import { insertAuditLog } from '@/lib/audit/insert-audit-log';
import { notDeleted } from '@/lib/audit/soft-delete';
import { createError } from '@/lib/logging/evlog';
import { merchantRules } from '@/modules/rules/db/schema';

export async function createMerchantRuleService(
  database: Db,
  userId: string,
  data: CreateMerchantRuleInput,
) {
  return database.transaction(async (tx) => {
    // Append new rules to the end of their stage so the composite
    // (stage, priority) key stays unique. Priority is never set by
    // callers; reorder owns the full ordering contract.
    const stage = data.stage ?? 'default';
    const [tail] = await tx
      .select({ priority: merchantRules.priority })
      .from(merchantRules)
      .where(
        and(
          eq(merchantRules.userId, userId),
          eq(merchantRules.stage, stage),
          notDeleted(merchantRules.deletedAt),
        ),
      )
      .orderBy(desc(merchantRules.priority))
      .limit(1);
    const priority = tail ? tail.priority + 1 : 0;

    const [rule] = await tx
      .insert(merchantRules)
      .values({
        actions: data.actions,
        createdById: userId,
        ...(data.isActive === undefined ? {} : { isActive: data.isActive }),
        match: data.match,
        priority,
        stage,
        userId,
      })
      .returning();

    if (!rule) {
      throw createError({
        fix: 'Try again. If the problem persists, contact support.',
        message: 'Failed to create merchant rule.',
        status: 500,
      });
    }

    await insertAuditLog(tx, {
      action: 'create',
      actorId: userId,
      afterData: rule as unknown as Record<string, unknown>,
      entityId: rule.id,
      tableName: 'merchant_rules',
    });

    return rule;
  });
}
