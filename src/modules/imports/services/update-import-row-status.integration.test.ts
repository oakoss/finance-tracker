import { expect } from 'vitest';

import type { Db } from '@/db';

import { updateImportRowStatusService } from '@/modules/imports/services/update-import-row-status';
import { insertAccountWithUser } from '~test/factories/account-with-user.factory';
import type { Db as TestDb } from '~test/factories/base';
import { insertImport, insertImportRow } from '~test/factories/import.factory';
import { test } from '~test/integration-setup';

const asDb = (db: TestDb) => db as unknown as Db;

test('updateImportRowStatus — toggles mapped to ignored', async ({
  serviceDb,
}) => {
  const { account, user } = await insertAccountWithUser(serviceDb);
  const imp = await insertImport(serviceDb, {
    accountId: account.id,
    status: 'completed',
    userId: user.id,
  });
  const row = await insertImportRow(serviceDb, {
    createdById: user.id,
    importId: imp.id,
    rawData: { raw: 'data' },
    rowIndex: 0,
    status: 'mapped',
  });

  const result = await updateImportRowStatusService(asDb(serviceDb), user.id, {
    id: row.id,
    status: 'ignored',
  });

  expect(result.status).toBe('ignored');
});

test('updateImportRowStatus — toggles ignored to mapped', async ({
  serviceDb,
}) => {
  const { account, user } = await insertAccountWithUser(serviceDb);
  const imp = await insertImport(serviceDb, {
    accountId: account.id,
    status: 'completed',
    userId: user.id,
  });
  const row = await insertImportRow(serviceDb, {
    createdById: user.id,
    importId: imp.id,
    rawData: { raw: 'data' },
    rowIndex: 0,
    status: 'ignored',
  });

  const result = await updateImportRowStatusService(asDb(serviceDb), user.id, {
    id: row.id,
    status: 'mapped',
  });

  expect(result.status).toBe('mapped');
});

test('updateImportRowStatus — rejects toggling committed row', async ({
  serviceDb,
}) => {
  const { account, user } = await insertAccountWithUser(serviceDb);
  const imp = await insertImport(serviceDb, {
    accountId: account.id,
    status: 'committed',
    userId: user.id,
  });
  const row = await insertImportRow(serviceDb, {
    createdById: user.id,
    importId: imp.id,
    rawData: { raw: 'data' },
    rowIndex: 0,
    status: 'committed',
  });

  await expect(
    updateImportRowStatusService(asDb(serviceDb), user.id, {
      id: row.id,
      status: 'mapped',
    }),
  ).rejects.toThrow(/cannot modify rows/i);
});

test('updateImportRowStatus — rejects other user row', async ({
  serviceDb,
}) => {
  const { account, user } = await insertAccountWithUser(serviceDb);
  const imp = await insertImport(serviceDb, {
    accountId: account.id,
    status: 'completed',
    userId: user.id,
  });
  const row = await insertImportRow(serviceDb, {
    importId: imp.id,
    rawData: { raw: 'data' },
    rowIndex: 0,
    status: 'mapped',
  });

  const { user: other } = await insertAccountWithUser(serviceDb);

  await expect(
    updateImportRowStatusService(asDb(serviceDb), other.id, {
      id: row.id,
      status: 'ignored',
    }),
  ).rejects.toThrow(/not found/i);
});
