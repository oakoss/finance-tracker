import { and, eq, sql } from 'drizzle-orm';

import type { Db } from '@/db';
import type { ProcessedNormalizedRow } from '@/modules/imports/lib/apply-column-mapping';
import type { CommitImportInput } from '@/modules/imports/validators';

import { insertAuditLog } from '@/lib/audit/insert-audit-log';
import { parsePgError } from '@/lib/db/pg-error';
import { createError, log } from '@/lib/logging/evlog';
import { hashId } from '@/lib/logging/hash';
import { importRows, imports } from '@/modules/imports/db/schema';
import { resolveCategoryByName } from '@/modules/imports/lib/resolve-category';
import { resolvePayeeId } from '@/modules/payees/lib/resolve-payee';
import { transactions } from '@/modules/transactions/db/schema';

export async function commitImportService(
  database: Db,
  userId: string,
  data: CommitImportInput,
) {
  return database.transaction(async (tx) => {
    // 1. Validate import ownership and status (FOR UPDATE prevents concurrent commits)
    const [importRecord] = await tx
      .select()
      .from(imports)
      .where(and(eq(imports.id, data.importId), eq(imports.userId, userId)))
      .for('update');

    if (!importRecord) {
      throw createError({
        fix: 'Select a valid import.',
        message: 'Import not found.',
        status: 404,
      });
    }

    if (importRecord.status !== 'completed') {
      throw createError({
        fix:
          importRecord.status === 'committed'
            ? 'This import has already been committed.'
            : 'Wait for the import to finish processing.',
        message: 'Import cannot be committed.',
        status: 409,
      });
    }

    // 2. Fetch mapped rows
    const mappedRows = await tx
      .select()
      .from(importRows)
      .where(
        and(
          eq(importRows.importId, data.importId),
          eq(importRows.status, 'mapped'),
        ),
      );

    if (mappedRows.length === 0) {
      throw createError({
        fix: 'Upload a CSV with valid rows before committing.',
        message: 'No rows to commit.',
        status: 422,
      });
    }

    // 3. Pre-resolve payees and categories
    const payeeNames = new Set<string>();
    const categoryNames = new Set<string>();

    for (const row of mappedRows) {
      const nd = row.normalizedData as ProcessedNormalizedRow | null;
      if (nd?.payeeName) payeeNames.add(nd.payeeName);
      if (nd?.categoryName) categoryNames.add(nd.categoryName);
    }

    const payeeMap = new Map<string, string>();
    for (const name of payeeNames) {
      try {
        const id = await resolvePayeeId(tx, { newPayeeName: name, userId });
        if (id) payeeMap.set(name, id);
      } catch (error) {
        log.warn({
          action: 'import.commit.resolvePayee',
          outcome: {
            error: error instanceof Error ? error.message : String(error),
            payeeName: name,
          },
          user: { idHash: hashId(userId) },
        });
      }
    }

    const categoryMap = new Map<string, string>();
    for (const name of categoryNames) {
      const id = await resolveCategoryByName(tx, userId, name);
      if (id) {
        categoryMap.set(name, id);
      } else {
        log.info({
          action: 'import.commit.categoryNotFound',
          outcome: { categoryName: name },
          user: { idHash: hashId(userId) },
        });
      }
    }

    // 4. Process each row with savepoints
    let committedCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    for (const row of mappedRows) {
      const nd = row.normalizedData as ProcessedNormalizedRow | null;

      if (
        !nd?.description ||
        !nd.transactionAt ||
        nd.amountCents === undefined
      ) {
        const reason = !nd?.description
          ? 'missing description'
          : !nd.transactionAt
            ? 'missing transactionAt'
            : 'missing amountCents';
        log.warn({
          action: 'import.commit.rowValidation',
          outcome: { reason, rowIndex: row.rowIndex },
          user: { idHash: hashId(userId) },
        });
        await tx
          .update(importRows)
          .set({ status: 'error' })
          .where(eq(importRows.id, row.id));
        errorCount++;
        continue;
      }

      const transactionAt = new Date(nd.transactionAt);
      if (Number.isNaN(transactionAt.getTime())) {
        log.warn({
          action: 'import.commit.rowValidation',
          outcome: { reason: 'invalid date', rowIndex: row.rowIndex },
          user: { idHash: hashId(userId) },
        });
        await tx
          .update(importRows)
          .set({ status: 'error' })
          .where(eq(importRows.id, row.id));
        errorCount++;
        continue;
      }

      if (nd.amountCents === 0) {
        log.warn({
          action: 'import.commit.rowValidation',
          outcome: { reason: 'zero amount', rowIndex: row.rowIndex },
          user: { idHash: hashId(userId) },
        });
        await tx
          .update(importRows)
          .set({ status: 'error' })
          .where(eq(importRows.id, row.id));
        errorCount++;
        continue;
      }

      const direction = nd.amountCents < 0 ? 'debit' : 'credit';
      const amountCents = Math.abs(nd.amountCents);
      const payeeId = nd.payeeName
        ? (payeeMap.get(nd.payeeName) ?? null)
        : null;
      const categoryId = nd.categoryName
        ? (categoryMap.get(nd.categoryName) ?? null)
        : null;

      const idx = row.rowIndex;
      const savepointName = `row_${idx}`;
      await tx.execute(sql.raw(`SAVEPOINT ${savepointName}`));

      try {
        const [txn] = await tx
          .insert(transactions)
          .values({
            accountId: importRecord.accountId,
            amountCents,
            categoryId,
            createdById: userId,
            description: nd.description,
            direction,
            fingerprint: nd.fingerprint ?? null,
            memo: nd.memo ?? null,
            payeeId,
            pending: false,
            postedAt: transactionAt,
            transactionAt,
          })
          .returning();

        await tx.execute(sql.raw(`RELEASE SAVEPOINT ${savepointName}`));

        if (txn) {
          await tx
            .update(importRows)
            .set({ status: 'committed', transactionId: txn.id })
            .where(eq(importRows.id, row.id));

          await insertAuditLog(tx, {
            action: 'create',
            actorId: userId,
            afterData: txn as unknown as Record<string, unknown>,
            entityId: txn.id,
            tableName: 'transactions',
          });

          committedCount++;
        }
      } catch (error) {
        await tx.execute(sql.raw(`ROLLBACK TO SAVEPOINT ${savepointName}`));

        const pgError = parsePgError(error);
        if (pgError?.code === '23505') {
          await tx
            .update(importRows)
            .set({ status: 'duplicate' })
            .where(eq(importRows.id, row.id));
          skippedCount++;
        } else {
          log.error({
            action: 'import.commit.rowError',
            outcome: {
              error: error instanceof Error ? error.message : String(error),
              rowIndex: row.rowIndex,
            },
            user: { idHash: hashId(userId) },
          });
          await tx
            .update(importRows)
            .set({ status: 'error' })
            .where(eq(importRows.id, row.id));
          errorCount++;
        }
      }
    }

    // 5. Update import status
    const finalStatus = committedCount > 0 ? 'committed' : 'failed';
    const [updated] = await tx
      .update(imports)
      .set({ status: finalStatus })
      .where(eq(imports.id, data.importId))
      .returning();

    if (!updated) {
      throw createError({
        fix: 'The import may have been modified. Refresh and try again.',
        message: 'Failed to update import status.',
        status: 409,
      });
    }

    await insertAuditLog(tx, {
      action: 'update',
      actorId: userId,
      afterData: updated as unknown as Record<string, unknown>,
      entityId: updated.id,
      tableName: 'imports',
    });

    log.info({
      action: 'import.commit',
      outcome: { committedCount, errorCount, skippedCount },
      user: { idHash: hashId(userId) },
    });

    return {
      committedCount,
      errorCount,
      importId: data.importId,
      skippedCount,
    };
  });
}
