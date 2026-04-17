import { and, eq, gt, inArray, isNull, sql } from 'drizzle-orm';

import type { Db, DbTx } from '@/db';
import type { RuleRunUndo } from '@/modules/rules/models';
import type { UndoRuleRunInput } from '@/modules/rules/validators';

import { insertAuditLog } from '@/lib/audit/insert-audit-log';
import { notDeleted } from '@/lib/audit/soft-delete';
import { ensureFound } from '@/lib/form/validation';
import { createError, log } from '@/lib/logging/evlog';
import { hashId } from '@/lib/logging/hash';
import { ruleRuns } from '@/modules/rules/db/schema';
import {
  transactions,
  transactionTags,
} from '@/modules/transactions/db/schema';

export type UndoRuleRunResult = {
  restoredCount: number;
  runId: string;
  skippedCount: number;
};

type UndoEntry = RuleRunUndo['transactions'][number];

export async function undoRuleRunService(
  database: Db,
  userId: string,
  data: UndoRuleRunInput,
): Promise<UndoRuleRunResult> {
  return database.transaction(async (tx) => {
    // Serialize undo per user for the same reason apply is serialized.
    const locked = await tx.execute(
      sql`select pg_try_advisory_xact_lock(hashtext(${`rule_apply:${userId}`})) as locked`,
    );
    if (!locked.rows[0]?.locked) {
      log.warn({
        action: 'ruleRun.undo',
        outcome: { reason: 'lock_contention', success: false },
        user: { idHash: hashId(userId) },
      });
      throw createError({
        fix: 'Another rule operation is already running. Wait a moment and try again.',
        message: 'Rule undo already in progress.',
        status: 409,
      });
    }

    const run = await ensureFound(
      tx.query.ruleRuns.findFirst({
        where: (t, { eq: e }) => e(t.id, data.runId),
        with: { rule: true },
      }),
      'Rule run',
    );

    if (run.rule.userId !== userId) {
      throw createError({
        fix: 'Refresh the page. This run may have been deleted.',
        message: 'Rule run not found.',
        status: 404,
      });
    }

    if (run.undoneAt !== null) {
      throw createError({
        fix: 'This run has already been undone.',
        message: 'Rule run is already undone.',
        status: 409,
      });
    }

    if (run.undoableUntil.getTime() < Date.now()) {
      throw createError({
        fix: 'The undo window has passed. Manually adjust any transactions you want to revert.',
        message: 'Undo window has expired.',
        status: 410,
      });
    }

    if (run.affectedTransactionIds.length > 0) {
      // pg text-array literal; Drizzle `${jsArr}` would emit a SQL tuple.
      const arrayLiteral = `{${run.affectedTransactionIds.join(',')}}`;
      const collisions = await tx
        .select({ id: ruleRuns.id })
        .from(ruleRuns)
        .where(
          and(
            // id (monotonic UUIDv7), not runAt: JS Date truncates microseconds.
            gt(ruleRuns.id, run.id),
            isNull(ruleRuns.undoneAt),
            sql`${ruleRuns.affectedTransactionIds} && ${arrayLiteral}::uuid[]`,
          ),
        )
        .limit(1);
      if (collisions.length > 0) {
        throw createError({
          fix: 'Undo the later runs first, or manually adjust affected transactions.',
          message:
            'Cannot undo — another rule run has modified the same transactions since.',
          status: 409,
        });
      }
    }

    let restoredCount = 0;
    let skippedSoftDeleted = 0;
    let tagConflictsSkipped = 0;

    for (const entry of run.undoData.transactions) {
      const outcome = await undoTransactionEntry(tx, userId, entry);
      if (outcome.softDeleted) skippedSoftDeleted += 1;
      if (outcome.restored) restoredCount += 1;
      tagConflictsSkipped += outcome.tagConflictsSkipped;
    }

    if (skippedSoftDeleted > 0 || tagConflictsSkipped > 0) {
      log.warn({
        action: 'ruleRun.undo',
        outcome: {
          reason: 'partial_restore',
          runIdHash: hashId(run.id),
          skippedSoftDeleted,
          success: false,
          tagConflictsSkipped,
        },
        user: { idHash: hashId(userId) },
      });
    }

    const [updated] = await tx
      .update(ruleRuns)
      .set({ undoneAt: new Date(), updatedById: userId })
      .where(and(eq(ruleRuns.id, run.id), isNull(ruleRuns.undoneAt)))
      .returning();

    if (!updated) {
      throw createError({
        fix: 'Refresh the page. Another request may have undone this run.',
        message: 'Rule run already undone.',
        status: 409,
      });
    }

    await insertAuditLog(tx, {
      action: 'update',
      actorId: userId,
      afterData: { skippedSoftDeleted, undoneAt: updated.undoneAt },
      beforeData: { undoneAt: null },
      entityId: run.id,
      tableName: 'rule_runs',
    });

    log.info({
      action: 'ruleRun.undo',
      outcome: {
        restoredCount,
        runIdHash: hashId(run.id),
        skippedCount: skippedSoftDeleted,
      },
      user: { idHash: hashId(userId) },
    });

    return { restoredCount, runId: run.id, skippedCount: skippedSoftDeleted };
  });
}

type EntryOutcome = {
  restored: boolean;
  softDeleted: boolean;
  tagConflictsSkipped: number;
};

async function undoTransactionEntry(
  tx: DbTx,
  userId: string,
  entry: UndoEntry,
): Promise<EntryOutcome> {
  const outcome: EntryOutcome = {
    restored: false,
    softDeleted: false,
    tagConflictsSkipped: 0,
  };

  // One up-front existence check gates all three reversal ops — tag
  // add/remove silently mutating a soft-deleted row is a correctness bug.
  const [liveRow] = await tx
    .select({ id: transactions.id })
    .from(transactions)
    .where(
      and(
        eq(transactions.id, entry.transactionId),
        notDeleted(transactions.deletedAt),
      ),
    );
  if (!liveRow) {
    outcome.softDeleted = true;
    return outcome;
  }

  const hasFieldPatch =
    entry.before !== undefined && Object.keys(entry.before).length > 0;

  if (hasFieldPatch) {
    const patch: Record<string, unknown> = { updatedById: userId };
    if ('categoryId' in entry.before!) {
      patch.categoryId = entry.before.categoryId;
    }
    if ('payeeId' in entry.before!) patch.payeeId = entry.before.payeeId;
    if ('note' in entry.before!) patch.memo = entry.before.note;

    await tx
      .update(transactions)
      .set(patch)
      .where(eq(transactions.id, entry.transactionId));
    outcome.restored = true;
  }

  if (entry.tagsAdded && entry.tagsAdded.length > 0) {
    await tx
      .delete(transactionTags)
      .where(
        and(
          eq(transactionTags.transactionId, entry.transactionId),
          inArray(transactionTags.tagId, entry.tagsAdded),
        ),
      );
    outcome.restored = true;
  }

  if (entry.tagsRemoved && entry.tagsRemoved.length > 0) {
    const inserted = await tx
      .insert(transactionTags)
      .values(
        entry.tagsRemoved.map((tagId) => ({
          createdById: userId,
          tagId,
          transactionId: entry.transactionId,
        })),
      )
      .onConflictDoNothing()
      .returning({ id: transactionTags.id });
    outcome.tagConflictsSkipped = entry.tagsRemoved.length - inserted.length;
    if (inserted.length > 0) outcome.restored = true;
  }

  return outcome;
}
