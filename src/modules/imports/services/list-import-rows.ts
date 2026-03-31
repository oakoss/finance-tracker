import { and, eq } from 'drizzle-orm';

import type { Db } from '@/db';
import type { ProcessedNormalizedRow } from '@/modules/imports/lib/apply-column-mapping';
import type { ListImportRowsInput } from '@/modules/imports/validators';

import { createError } from '@/lib/logging/evlog';
import { ledgerAccounts } from '@/modules/accounts/db/schema';
import { importRows, imports } from '@/modules/imports/db/schema';

export async function listImportRowsService(
  database: Db,
  userId: string,
  data: ListImportRowsInput,
) {
  const [importRecord] = await database
    .select({
      accountId: imports.accountId,
      fileName: imports.fileName,
      id: imports.id,
      importedAt: imports.importedAt,
      status: imports.status,
    })
    .from(imports)
    .where(and(eq(imports.id, data.importId), eq(imports.userId, userId)));

  if (!importRecord) {
    throw createError({
      fix: 'Select a valid import.',
      message: 'Import not found.',
      status: 404,
    });
  }

  const [account] = await database
    .select({ name: ledgerAccounts.name })
    .from(ledgerAccounts)
    .where(eq(ledgerAccounts.id, importRecord.accountId));

  const rows = await database
    .select({
      id: importRows.id,
      normalizedData: importRows.normalizedData,
      rawData: importRows.rawData,
      rowIndex: importRows.rowIndex,
      status: importRows.status,
    })
    .from(importRows)
    .where(eq(importRows.importId, data.importId))
    .orderBy(importRows.rowIndex);

  return {
    import: { ...importRecord, accountName: account?.name ?? null },
    rows: rows.map((row) => ({
      ...row,
      normalizedData: row.normalizedData as ProcessedNormalizedRow | null,
      rawData: row.rawData as Record<string, string>,
    })),
  };
}
