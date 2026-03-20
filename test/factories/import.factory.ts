import { faker } from '@faker-js/faker';

import type { Import, ImportInsert, ImportRow } from '@/modules/imports/models';

import { importRows, imports } from '@/db/schema';
import { type Db, fakeDate, fakeId } from '~test/factories/base';

export function createImport(overrides?: Partial<Import>): Import {
  const now = fakeDate();
  return {
    accountId: fakeId(),
    columnMapping: null,
    createdAt: now,
    createdById: null,
    deletedAt: null,
    deletedById: null,
    fileHash: faker.string.alphanumeric(64),
    fileName: `${faker.word.noun()}.csv`,
    finishedAt: null,
    id: fakeId(),
    importedAt: now,
    source: 'csv',
    startedAt: null,
    status: 'pending',
    updatedAt: now,
    updatedById: null,
    userId: fakeId(),
    ...overrides,
  };
}

export async function insertImport(
  db: Db,
  overrides: Pick<ImportInsert, 'accountId' | 'userId'> & Partial<ImportInsert>,
): Promise<Import> {
  const data: ImportInsert = {
    fileName: `${faker.word.noun()}.csv`,
    source: 'csv',
    ...overrides,
  };
  const [row] = await db.insert(imports).values(data).returning();
  return row;
}

export async function insertImportRow(
  db: Db,
  overrides: Pick<ImportRow, 'importId'> & Partial<ImportRow>,
): Promise<ImportRow> {
  const [row] = await db
    .insert(importRows)
    .values({
      rawData: { amount: '100.00', date: '2024-01-01', description: 'Test' },
      rowIndex: 0,
      ...overrides,
    })
    .returning();
  return row;
}
