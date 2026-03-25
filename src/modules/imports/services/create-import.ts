import { and, eq } from 'drizzle-orm';
import Papa from 'papaparse';

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
} from '@/modules/imports/lib/apply-column-mapping';

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

    const parsed = Papa.parse<Record<string, string>>(data.fileContent, {
      header: true,
      skipEmptyLines: true,
    });

    if (parsed.errors.length > 0 && parsed.data.length === 0) {
      throw createError({
        fix: 'Check the CSV format and try again.',
        message: 'Failed to parse CSV.',
        status: 422,
      });
    }

    if (parsed.errors.length > 0 && parsed.data.length > 0) {
      log.warn({
        action: 'import.create.partialParse',
        outcome: {
          errorCount: parsed.errors.length,
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

    const rowValues = parsed.data.map((rawData, index) => {
      let normalizedData = null;
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
        }
      }
      return {
        createdById: userId,
        importId: importRecord.id,
        normalizedData,
        rawData,
        rowIndex: index,
      };
    });

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

    return { ...updated, rowCount: parsed.data.length };
  });
}
