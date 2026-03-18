import { count, desc, eq } from 'drizzle-orm';

import type { Db } from '@/db';

import { ledgerAccounts } from '@/modules/accounts/db/schema';
import { importRows, imports } from '@/modules/imports/db/schema';

export async function listImportsService(database: Db, userId: string) {
  const rowCounts = database
    .select({ count: count().as('row_count'), importId: importRows.importId })
    .from(importRows)
    .groupBy(importRows.importId)
    .as('row_counts');

  return database
    .select({
      accountName: ledgerAccounts.name,
      fileHash: imports.fileHash,
      fileName: imports.fileName,
      id: imports.id,
      importedAt: imports.importedAt,
      rowCount: rowCounts.count,
      source: imports.source,
      status: imports.status,
    })
    .from(imports)
    .leftJoin(ledgerAccounts, eq(ledgerAccounts.id, imports.accountId))
    .leftJoin(rowCounts, eq(rowCounts.importId, imports.id))
    .where(eq(imports.userId, userId))
    .orderBy(desc(imports.createdAt));
}
