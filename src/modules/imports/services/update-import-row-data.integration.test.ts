import { expect } from 'vitest';

import type { Db } from '@/db';

import { updateImportRowDataService } from '@/modules/imports/services/update-import-row-data';
import { insertAccountWithUser } from '~test/factories/account-with-user.factory';
import type { Db as TestDb } from '~test/factories/base';
import { insertImport, insertImportRow } from '~test/factories/import.factory';
import { test } from '~test/integration-setup';

const asDb = (db: TestDb) => db as unknown as Db;

test('updateImportRowData — updates description and preserves other fields', async ({
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
    normalizedData: {
      amountCents: -450,
      description: 'Coffee',
      transactionAt: '2024-01-15',
    },
    rawData: { raw: 'data' },
    rowIndex: 0,
    status: 'mapped',
  });

  const result = await updateImportRowDataService(asDb(serviceDb), user.id, {
    id: row.id,
    normalizedData: { description: 'Tea' },
  });

  const nd = result.normalizedData;
  expect(nd.description).toBe('Tea');
  expect(nd.amountCents).toBe(-450);
  expect(nd.transactionAt).toBe('2024-01-15');
});

test('updateImportRowData — recomputes fingerprint on key field change', async ({
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
    normalizedData: {
      amountCents: -450,
      description: 'Coffee',
      fingerprint: 'old-fingerprint',
      transactionAt: '2024-01-15',
    },
    rawData: { raw: 'data' },
    rowIndex: 0,
    status: 'mapped',
  });

  const result = await updateImportRowDataService(asDb(serviceDb), user.id, {
    id: row.id,
    normalizedData: { description: 'Tea' },
  });

  const nd = result.normalizedData;
  expect(nd.fingerprint).toBeDefined();
  expect(nd.fingerprint).not.toBe('old-fingerprint');
});

test('updateImportRowData — does not recompute fingerprint for non-key field', async ({
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
    normalizedData: {
      amountCents: -450,
      description: 'Coffee',
      fingerprint: 'original-fp',
      transactionAt: '2024-01-15',
    },
    rawData: { raw: 'data' },
    rowIndex: 0,
    status: 'mapped',
  });

  const result = await updateImportRowDataService(asDb(serviceDb), user.id, {
    id: row.id,
    normalizedData: { memo: 'morning latte' },
  });

  const nd = result.normalizedData;
  expect(nd.fingerprint).toBe('original-fp');
  expect(nd.memo).toBe('morning latte');
});

test('updateImportRowData — rejects editing non-mapped row', async ({
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
    normalizedData: { errorReason: 'bad' },
    rawData: { raw: 'data' },
    rowIndex: 0,
    status: 'error',
  });

  await expect(
    updateImportRowDataService(asDb(serviceDb), user.id, {
      id: row.id,
      normalizedData: { description: 'fixed' },
    }),
  ).rejects.toThrow(/cannot be edited/i);
});

test('updateImportRowData — rejects editing row on committed import', async ({
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
    normalizedData: { description: 'Coffee' },
    rawData: { raw: 'data' },
    rowIndex: 0,
    status: 'mapped',
  });

  await expect(
    updateImportRowDataService(asDb(serviceDb), user.id, {
      id: row.id,
      normalizedData: { description: 'hacked' },
    }),
  ).rejects.toThrow(/cannot modify rows/i);
});

test('updateImportRowData — rejects other user row', async ({ serviceDb }) => {
  const { account, user } = await insertAccountWithUser(serviceDb);
  const imp = await insertImport(serviceDb, {
    accountId: account.id,
    status: 'completed',
    userId: user.id,
  });
  const row = await insertImportRow(serviceDb, {
    importId: imp.id,
    normalizedData: { description: 'Coffee' },
    rawData: { raw: 'data' },
    rowIndex: 0,
    status: 'mapped',
  });

  const { user: other } = await insertAccountWithUser(serviceDb);

  await expect(
    updateImportRowDataService(asDb(serviceDb), other.id, {
      id: row.id,
      normalizedData: { description: 'hacked' },
    }),
  ).rejects.toThrow(/not found/i);
});
