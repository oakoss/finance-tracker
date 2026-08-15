import { expect } from 'vitest';

import { listImportRowsService } from '@/modules/imports/services/list-import-rows';
import { asDb } from '~test/db';
import { insertAccountWithUser } from '~test/factories/account-with-user.factory';
import { insertImport, insertImportRow } from '~test/factories/import.factory';
import { test } from '~test/integration-setup';

test('listImportRows — returns rows ordered by rowIndex', async ({
  serviceDb,
}) => {
  const { account, user } = await insertAccountWithUser(serviceDb);
  const imp = await insertImport(serviceDb, {
    accountId: account.id,
    status: 'completed',
    userId: user.id,
  });

  await insertImportRow(serviceDb, {
    importId: imp.id,
    rawData: { a: '1' },
    rowIndex: 2,
  });
  await insertImportRow(serviceDb, {
    importId: imp.id,
    rawData: { a: '0' },
    rowIndex: 0,
  });
  await insertImportRow(serviceDb, {
    importId: imp.id,
    rawData: { a: '1' },
    rowIndex: 1,
  });

  const result = await listImportRowsService(asDb(serviceDb), user.id, {
    importId: imp.id,
  });

  expect(result.rows).toHaveLength(3);
  expect(result.rows[0].rowIndex).toBe(0);
  expect(result.rows[1].rowIndex).toBe(1);
  expect(result.rows[2].rowIndex).toBe(2);
  expect(result.import.id).toBe(imp.id);
  expect(result.import.accountName).toBe(account.name);
});

test('listImportRows — rejects import not owned by user', async ({
  serviceDb,
}) => {
  const { account, user } = await insertAccountWithUser(serviceDb);
  const imp = await insertImport(serviceDb, {
    accountId: account.id,
    status: 'completed',
    userId: user.id,
  });

  const { user: other } = await insertAccountWithUser(serviceDb);

  await expect(
    listImportRowsService(asDb(serviceDb), other.id, { importId: imp.id }),
  ).rejects.toThrow(/import not found/i);
});

test('listImportRows — returns empty rows for import with no rows', async ({
  serviceDb,
}) => {
  const { account, user } = await insertAccountWithUser(serviceDb);
  const imp = await insertImport(serviceDb, {
    accountId: account.id,
    status: 'completed',
    userId: user.id,
  });

  const result = await listImportRowsService(asDb(serviceDb), user.id, {
    importId: imp.id,
  });

  expect(result.rows).toHaveLength(0);
});
