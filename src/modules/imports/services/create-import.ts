import { and, eq, inArray, isNull } from 'drizzle-orm';

import type { Db } from '@/db';
import type { CreateImportInput } from '@/modules/imports/validators';

import { insertAuditLog } from '@/lib/audit/insert-audit-log';
import { createError, log } from '@/lib/logging/evlog';
import { hashId } from '@/lib/logging/hash';
import { ledgerAccounts } from '@/modules/accounts/db/schema';
import { importRows, imports } from '@/modules/imports/db/schema';
import {
  applyColumnMapping,
  buildReverseMap,
  type ProcessedNormalizedRow,
} from '@/modules/imports/lib/apply-column-mapping';
import { computeRowFingerprint } from '@/modules/imports/lib/compute-row-fingerprint';
import { parseCsvString } from '@/modules/imports/lib/parse-csv';
import { validateImportRow } from '@/modules/imports/lib/validate-import-row';
import { transactions } from '@/modules/transactions/db/schema';

export async function createImportService(
  database: Db,
  userId: string,
  data: CreateImportInput,
) {
  return database.transaction(async (tx) => {
    const [account] = await tx
      .select({ id: ledgerAccounts.id })
      .from(ledgerAccounts)
      .where(
        and(
          eq(ledgerAccounts.id, data.accountId),
          eq(ledgerAccounts.userId, userId),
        ),
      );

    if (!account) {
      throw createError({
        fix: 'Select a valid account.',
        message: 'Account not found.',
        status: 404,
      });
    }

    const [existing] = await tx
      .select({ id: imports.id })
      .from(imports)
      .where(
        and(eq(imports.fileHash, data.fileHash), eq(imports.userId, userId)),
      );

    if (existing) {
      throw createError({
        fix: 'This file has already been imported.',
        message: 'Duplicate import.',
        status: 409,
      });
    }

    const parsed = parseCsvString(data.fileContent, { skipEmptyLines: true });

    if (parsed.errorCount > 0 && parsed.data.length === 0) {
      throw createError({
        fix: 'Check the CSV format and try again.',
        message: 'Failed to parse CSV.',
        status: 422,
      });
    }

    if (parsed.errorCount > 0 && parsed.data.length > 0) {
      log.warn({
        action: 'import.create.partialParse',
        outcome: {
          errorCount: parsed.errorCount,
          successCount: parsed.data.length,
        },
        user: { idHash: hashId(userId) },
      });
    }

    if (parsed.data.length === 0) {
      throw createError({
        fix: 'The file appears to be empty. Upload a CSV with data rows.',
        message: 'CSV has no data rows.',
        status: 422,
      });
    }

    const [importRecord] = await tx
      .insert(imports)
      .values({
        accountId: data.accountId,
        columnMapping: data.columnMapping ?? null,
        createdById: userId,
        fileHash: data.fileHash,
        fileName: data.fileName,
        source: 'csv',
        status: 'pending',
        userId,
      })
      .returning();

    if (!importRecord) {
      throw createError({
        fix: 'Try again. If the problem persists, contact support.',
        message: 'Failed to create import.',
        status: 500,
      });
    }

    const reverseMap = data.columnMapping
      ? buildReverseMap(data.columnMapping)
      : null;

    // Phase 1: Map, validate, and fingerprint each row
    type ProcessedRow = {
      normalizedData: ProcessedNormalizedRow | null;
      rawData: Record<string, string>;
      rowIndex: number;
      status: 'duplicate' | 'error' | 'mapped';
    };

    const processedRows: ProcessedRow[] = parsed.data.map((rawData, index) => {
      let normalizedData: ProcessedNormalizedRow | null = null;
      let status: 'duplicate' | 'error' | 'mapped' = 'mapped';

      if (data.columnMapping && reverseMap) {
        try {
          normalizedData = applyColumnMapping(
            rawData,
            data.columnMapping,
            reverseMap,
          );
        } catch (error) {
          log.warn({
            action: 'import.create.normalizationError',
            outcome: {
              error: error instanceof Error ? error.message : String(error),
              rowIndex: index,
            },
            user: { idHash: hashId(userId) },
          });
          status = 'error';
          normalizedData = {
            errorReason: `Column mapping failed: ${error instanceof Error ? error.message : String(error)}`,
          };
        }

        if (normalizedData && status !== 'error') {
          const validation = validateImportRow(normalizedData);
          if (!validation.valid) {
            status = 'error';
            normalizedData.errorReason = validation.errors.join('; ');
          } else {
            const fp = computeRowFingerprint(normalizedData);
            if (fp) {
              normalizedData.fingerprint = fp;
            } else {
              log.error({
                action: 'import.create.fingerprintMissing',
                outcome: { rowIndex: index },
                user: { idHash: hashId(userId) },
              });
            }
          }
        }
      }

      return { normalizedData, rawData, rowIndex: index, status };
    });

    // Phase 2: Intra-CSV dedupe
    const fingerprintFirstSeen = new Map<string, number>();
    for (const row of processedRows) {
      if (row.status !== 'mapped') continue;
      const fp = row.normalizedData?.fingerprint;
      if (!fp) continue;
      if (fingerprintFirstSeen.has(fp)) {
        row.status = 'duplicate';
      } else {
        fingerprintFirstSeen.set(fp, row.rowIndex);
      }
    }

    // Phase 3: DB dedupe against existing transactions
    const uniqueFingerprints = [...fingerprintFirstSeen.keys()];
    if (uniqueFingerprints.length > 0) {
      const existingSet = new Set<string>();
      const FP_BATCH = 1000;
      for (let i = 0; i < uniqueFingerprints.length; i += FP_BATCH) {
        const batch = uniqueFingerprints.slice(i, i + FP_BATCH);
        const existing = await tx
          .select({ fingerprint: transactions.fingerprint })
          .from(transactions)
          .where(
            and(
              eq(transactions.accountId, data.accountId),
              inArray(transactions.fingerprint, batch),
              isNull(transactions.deletedAt),
            ),
          );
        for (const row of existing) {
          if (row.fingerprint) existingSet.add(row.fingerprint);
        }
      }

      if (existingSet.size > 0) {
        for (const row of processedRows) {
          if (row.status !== 'mapped') continue;
          const fp = row.normalizedData?.fingerprint;
          if (fp && existingSet.has(fp)) row.status = 'duplicate';
        }
      }
    }

    // Build insert values
    const rowValues = processedRows.map((row) => ({
      createdById: userId,
      importId: importRecord.id,
      normalizedData: row.normalizedData,
      rawData: row.rawData,
      rowIndex: row.rowIndex,
      status: row.status,
    }));

    const counts = { duplicate: 0, error: 0, mapped: 0 };
    for (const row of processedRows) {
      counts[row.status]++;
    }

    const now = new Date();
    await tx
      .update(imports)
      .set({ startedAt: now, status: 'processing' })
      .where(eq(imports.id, importRecord.id));

    const BATCH_SIZE = 500;
    for (let i = 0; i < rowValues.length; i += BATCH_SIZE) {
      await tx.insert(importRows).values(rowValues.slice(i, i + BATCH_SIZE));
    }

    const [updated] = await tx
      .update(imports)
      .set({ finishedAt: new Date(), status: 'completed' })
      .where(eq(imports.id, importRecord.id))
      .returning();

    if (!updated) {
      throw createError({
        fix: 'Try again. If the problem persists, contact support.',
        message: 'Failed to finalize import.',
        status: 500,
      });
    }

    await insertAuditLog(tx, {
      action: 'create',
      actorId: userId,
      afterData: updated as unknown as Record<string, unknown>,
      entityId: importRecord.id,
      tableName: 'imports',
    });

    return {
      ...updated,
      duplicateCount: counts.duplicate,
      errorCount: counts.error,
      mappedCount: counts.mapped,
      parseErrorCount: parsed.errorCount,
      rowCount: parsed.data.length,
    };
  });
}
