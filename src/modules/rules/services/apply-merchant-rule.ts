import { and, asc, eq, inArray, notInArray, sql } from 'drizzle-orm';

import type { Db, DbTx } from '@/db';
import type { RuleAction, RuleRunUndo } from '@/modules/rules/models';
import type { ApplyMerchantRuleInput } from '@/modules/rules/validators';

import { insertAuditLog } from '@/lib/audit/insert-audit-log';
import { notDeleted } from '@/lib/audit/soft-delete';
import { ensureFound } from '@/lib/form/validation';
import { createError, log } from '@/lib/logging/evlog';
import { hashId } from '@/lib/logging/hash';
import { categories } from '@/modules/categories/db/schema';
import { payees } from '@/modules/payees/db/schema';
import { ruleRuns } from '@/modules/rules/db/schema';
import { foldActions } from '@/modules/rules/services/fold-actions';
import { buildMatchWhere } from '@/modules/rules/services/match-predicate-sql';
import {
  tags,
  transactions,
  transactionTags,
} from '@/modules/transactions/db/schema';

const BATCH_SIZE = 500;

export type ApplyMerchantRuleResult = {
  count: number;
  runId: string;
  undoableUntil: Date;
};

export async function applyMerchantRuleService(
  database: Db,
  userId: string,
  data: ApplyMerchantRuleInput,
): Promise<ApplyMerchantRuleResult> {
  return database.transaction(async (tx) => {
    // Serialize per user: concurrent applies would corrupt undoData.
    const locked = await tx.execute(
      sql`select pg_try_advisory_xact_lock(hashtext(${`rule_apply:${userId}`})) as locked`,
    );
    if (!locked.rows[0]?.locked) {
      log.warn({
        action: 'merchantRule.apply',
        outcome: {
          reason: 'lock_contention',
          ruleIdHash: hashId(data.id),
          success: false,
        },
        user: { idHash: hashId(userId) },
      });
      throw createError({
        fix: 'Another rule apply is already running. Wait a moment and try again.',
        message: 'Rule apply already in progress.',
        status: 409,
      });
    }

    // SET can't be parameterized; literal bounds regex backtracking.
    await tx.execute(sql`set local statement_timeout = '10s'`);

    const rule = await ensureFound(
      tx.query.merchantRules.findFirst({
        where: (t, { and: a, eq: e }) =>
          a(e(t.id, data.id), e(t.userId, userId), notDeleted(t.deletedAt)),
      }),
      'Merchant rule',
    );

    if (!rule.isActive) {
      throw createError({
        fix: 'Toggle the rule on before applying it.',
        message: 'Cannot apply an inactive rule.',
        status: 422,
      });
    }

    if (rule.actions.some((a) => a.kind === 'setExcludedFromBudget')) {
      throw createError({
        fix: 'Remove the "exclude from budget" action from this rule. Support is coming soon.',
        message:
          'The "exclude from budget" action is not yet supported at apply time.',
        status: 501,
      });
    }

    await validateActionReferences(tx, userId, rule.actions);

    // Exclude IDs aren't re-scoped: buildMatchWhere already bounds to
    // caller's accounts, so foreign/deleted IDs can't leak through NOT IN.
    const excludeIds = data.excludeTransactionIds ?? [];
    const baseWhere = buildMatchWhere(rule.match, userId);
    const where =
      excludeIds.length > 0
        ? and(baseWhere, notInArray(transactions.id, excludeIds))!
        : baseWhere;

    const undoEntries: RuleRunUndo['transactions'] = [];
    const affectedIds: string[] = [];

    let offset = 0;
    while (true) {
      const batch = await tx
        .select({
          categoryId: transactions.categoryId,
          id: transactions.id,
          memo: transactions.memo,
          payeeId: transactions.payeeId,
        })
        .from(transactions)
        .where(where)
        .orderBy(asc(transactions.id))
        .limit(BATCH_SIZE)
        .offset(offset);

      if (batch.length === 0) break;

      for (const row of batch) {
        try {
          const fold = foldActions(rule.actions, row);
          const hasFieldPatch = Object.keys(fold.patch).length > 0;

          if (hasFieldPatch) {
            await tx
              .update(transactions)
              .set({ ...fold.patch, updatedById: userId })
              .where(eq(transactions.id, row.id));
          }

          const tagDelta = await applyTagPlan(tx, userId, row.id, fold.tagPlan);

          if (
            fold.before !== undefined ||
            tagDelta.added.length > 0 ||
            tagDelta.removed.length > 0
          ) {
            const entry: RuleRunUndo['transactions'][number] = {
              transactionId: row.id,
            };
            if (fold.before !== undefined) entry.before = fold.before;
            if (tagDelta.added.length > 0) entry.tagsAdded = tagDelta.added;
            if (tagDelta.removed.length > 0) {
              entry.tagsRemoved = tagDelta.removed;
            }
            undoEntries.push(entry);
            affectedIds.push(row.id);
          }
        } catch (error) {
          log.error({
            action: 'merchantRule.apply',
            error: error instanceof Error ? error.message : String(error),
            outcome: {
              offset,
              reason: 'batch_row_failed',
              rowIdHash: hashId(row.id),
              ruleIdHash: hashId(rule.id),
              success: false,
            },
            user: { idHash: hashId(userId) },
          });
          throw error;
        }
      }

      if (batch.length < BATCH_SIZE) break;
      offset += batch.length;
    }

    const [run] = await tx
      .insert(ruleRuns)
      .values({
        affectedTransactionIds: affectedIds,
        createdById: userId,
        ruleId: rule.id,
        undoData: { transactions: undoEntries },
      })
      .returning();

    if (!run) {
      throw createError({
        fix: 'Try again. If the problem persists, contact support.',
        message: 'Failed to persist rule run.',
        status: 500,
      });
    }

    await insertAuditLog(tx, {
      action: 'create',
      actorId: userId,
      afterData: { affectedCount: affectedIds.length, ruleId: rule.id },
      entityId: run.id,
      tableName: 'rule_runs',
    });

    log.info({
      action: 'merchantRule.apply',
      outcome: {
        count: affectedIds.length,
        ruleIdHash: hashId(rule.id),
        runIdHash: hashId(run.id),
      },
      user: { idHash: hashId(userId) },
    });

    return {
      count: affectedIds.length,
      runId: run.id,
      undoableUntil: run.undoableUntil,
    };
  });
}

async function validateActionReferences(
  tx: DbTx,
  userId: string,
  actions: RuleAction[],
): Promise<void> {
  const categoryIds = new Set<string>();
  const payeeIds = new Set<string>();
  const tagIds = new Set<string>();

  for (const action of actions) {
    switch (action.kind) {
      case 'setCategory': {
        categoryIds.add(action.categoryId);
        break;
      }
      case 'setPayee': {
        payeeIds.add(action.payeeId);
        break;
      }
      case 'setTags': {
        for (const id of action.tagIds) tagIds.add(id);
        break;
      }
    }
  }

  const missingCategory = await findMissingIds(
    tx,
    userId,
    categoryIds,
    categories,
  );
  if (missingCategory.length > 0) {
    throw referenceError('category', missingCategory, userId);
  }

  const missingPayee = await findMissingIds(tx, userId, payeeIds, payees);
  if (missingPayee.length > 0) {
    throw referenceError('payee', missingPayee, userId);
  }

  const missingTag = await findMissingIds(tx, userId, tagIds, tags);
  if (missingTag.length > 0) {
    throw referenceError('tag', missingTag, userId);
  }
}

type EntityTable = typeof categories | typeof payees | typeof tags;

async function findMissingIds(
  tx: DbTx,
  userId: string,
  ids: Set<string>,
  table: EntityTable,
): Promise<string[]> {
  if (ids.size === 0) return [];
  const rows = await tx
    .select({ id: table.id })
    .from(table)
    .where(
      and(
        eq(table.userId, userId),
        inArray(table.id, [...ids]),
        notDeleted(table.deletedAt),
      ),
    );
  const found = new Set(rows.map((row) => row.id));
  return [...ids].filter((id) => !found.has(id));
}

function referenceError(
  kind: 'category' | 'payee' | 'tag',
  missingIds: string[],
  userId: string,
) {
  log.warn({
    action: 'merchantRule.apply',
    outcome: {
      kind,
      missingCount: missingIds.length,
      missingIdHashes: missingIds.slice(0, 5).map((id) => hashId(id)),
      reason: 'missing_reference',
      success: false,
    },
    user: { idHash: hashId(userId) },
  });
  return createError({
    fix: `Edit the rule and pick a valid ${kind}. ${missingIds.length} reference${missingIds.length === 1 ? '' : 's'} could not be resolved.`,
    message: `Rule references a missing or deleted ${kind}.`,
    status: 422,
  });
}

// `added ∩ removed = ∅` — applyTagPlan is the sole producer and computes
// these from a set-difference.
type TagDelta = { added: string[]; removed: string[] };

async function applyTagPlan(
  tx: DbTx,
  userId: string,
  transactionId: string,
  plan: ReturnType<typeof foldActions>['tagPlan'],
): Promise<TagDelta> {
  if (plan.kind === 'none') return { added: [], removed: [] };

  if (plan.kind === 'replace') {
    const existing = await tx
      .select({ tagId: transactionTags.tagId })
      .from(transactionTags)
      .where(eq(transactionTags.transactionId, transactionId));
    const existingIds = new Set(existing.map((row) => row.tagId));
    const targetIds = new Set(plan.tagIds);

    const added = [...targetIds].filter((id) => !existingIds.has(id));
    const removed = [...existingIds].filter((id) => !targetIds.has(id));

    if (added.length === 0 && removed.length === 0) {
      return { added: [], removed: [] };
    }

    await tx
      .delete(transactionTags)
      .where(eq(transactionTags.transactionId, transactionId));

    if (plan.tagIds.length > 0) {
      await tx
        .insert(transactionTags)
        .values(
          plan.tagIds.map((tagId) => ({
            createdById: userId,
            tagId,
            transactionId,
          })),
        );
    }

    return { added, removed };
  }

  const existing = await tx
    .select({ tagId: transactionTags.tagId })
    .from(transactionTags)
    .where(
      and(
        eq(transactionTags.transactionId, transactionId),
        inArray(transactionTags.tagId, plan.tagIds),
      ),
    );
  const existingIds = new Set(existing.map((row) => row.tagId));
  const toAdd = plan.tagIds.filter((id) => !existingIds.has(id));

  if (toAdd.length === 0) return { added: [], removed: [] };

  await tx
    .insert(transactionTags)
    .values(
      toAdd.map((tagId) => ({ createdById: userId, tagId, transactionId })),
    );

  return { added: toAdd, removed: [] };
}
