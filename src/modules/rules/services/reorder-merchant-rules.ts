import { and, eq } from 'drizzle-orm';

import type { Db } from '@/db';
import type { ReorderMerchantRulesInput } from '@/modules/rules/validators';

import { insertAuditLog } from '@/lib/audit/insert-audit-log';
import { notDeleted } from '@/lib/audit/soft-delete';
import { createError, log } from '@/lib/logging/evlog';
import { hashId } from '@/lib/logging/hash';
import { merchantRules } from '@/modules/rules/db/schema';

export async function reorderMerchantRulesService(
  database: Db,
  userId: string,
  data: ReorderMerchantRulesInput,
) {
  return database.transaction(async (tx) => {
    const existing = await tx
      .select({
        id: merchantRules.id,
        priority: merchantRules.priority,
        stage: merchantRules.stage,
      })
      .from(merchantRules)
      .where(
        and(
          eq(merchantRules.userId, userId),
          eq(merchantRules.stage, data.stage),
          notDeleted(merchantRules.deletedAt),
        ),
      );

    const existingIds = new Set(existing.map((r) => r.id));
    const orderedSet = new Set(data.orderedIds);
    const missing = [...existingIds].filter((id) => !orderedSet.has(id));
    const extra = data.orderedIds.filter((id) => !existingIds.has(id));

    if (missing.length > 0 || extra.length > 0) {
      throw createError({
        fix: 'Refresh the page and try again. The rule list may have changed.',
        message:
          'orderedIds must list every rule in the stage exactly once, with no extras.',
        status: 422,
      });
    }

    const priorityById = new Map(existing.map((r) => [r.id, r.priority]));

    for (const [index, id] of data.orderedIds.entries()) {
      const before = priorityById.get(id);
      if (before === undefined) {
        // Preflight set-equality check above should make this unreachable.
        throw createError({
          fix: 'Refresh the page and try again.',
          message: 'Rule priority lookup failed during reorder.',
          status: 500,
        });
      }
      if (before === index) continue;

      const [updated] = await tx
        .update(merchantRules)
        .set({ priority: index, updatedById: userId })
        .where(
          and(
            eq(merchantRules.id, id),
            eq(merchantRules.userId, userId),
            notDeleted(merchantRules.deletedAt),
          ),
        )
        .returning();

      if (!updated) {
        log.warn({
          action: 'merchantRule.reorder',
          outcome: { reason: 'vanished', success: false },
          user: { idHash: hashId(userId) },
        });
        throw createError({
          fix: 'Refresh the page. A rule in this stage may have been deleted.',
          message: 'Merchant rule not found during reorder.',
          status: 409,
        });
      }

      await insertAuditLog(tx, {
        action: 'update',
        actorId: userId,
        afterData: { priority: index } as Record<string, unknown>,
        beforeData: { priority: before } as Record<string, unknown>,
        entityId: id,
        tableName: 'merchant_rules',
      });
    }
  });
}
