import { expect } from 'vitest';

import type { Db } from '@/db';

import { listImportsService } from '@/modules/imports/services/list-imports';
import { insertAccountWithUser } from '~test/factories/account-with-user.factory';
import type { Db as TestDb } from '~test/factories/base';
import { insertImport, insertImportRow } from '~test/factories/import.factory';
import { insertUser } from '~test/factories/user.factory';
import { test } from '~test/integration-setup';

const asDb = (db: TestDb) => db as unknown as Db;

test('list — returns only imports for the requesting user', async ({ db }) => {
  const { account: account1, user: user1 } = await insertAccountWithUser(db);
  const { account: account2, user: user2 } = await insertAccountWithUser(db);

  await insertImport(db, { accountId: account1.id, userId: user1.id });
  await insertImport(db, { accountId: account2.id, userId: user2.id });

  const result = await listImportsService(asDb(db), user1.id);

  expect(result).toHaveLength(1);
  expect(result[0].accountName).toBe(account1.name);
});

test('list — returns empty array when user has no imports', async ({ db }) => {
  const user = await insertUser(db);

  const result = await listImportsService(asDb(db), user.id);

  expect(result).toHaveLength(0);
});

test('list — includes row count from joined subquery', async ({ db }) => {
  const { account, user } = await insertAccountWithUser(db);
  const imp = await insertImport(db, {
    accountId: account.id,
    userId: user.id,
  });

  await insertImportRow(db, { importId: imp.id, rowIndex: 0 });
  await insertImportRow(db, { importId: imp.id, rowIndex: 1 });
  await insertImportRow(db, { importId: imp.id, rowIndex: 2 });

  const result = await listImportsService(asDb(db), user.id);

  expect(result).toHaveLength(1);
  expect(result[0].rowCount).toBe(3);
});

test('list — returns account name from join', async ({ db }) => {
  const { account, user } = await insertAccountWithUser(db);
  await insertImport(db, { accountId: account.id, userId: user.id });

  const result = await listImportsService(asDb(db), user.id);

  expect(result[0].accountName).toBe(account.name);
});

test('list — respects limit parameter', async ({ db }) => {
  const { account, user } = await insertAccountWithUser(db);

  await insertImport(db, { accountId: account.id, userId: user.id });
  await insertImport(db, { accountId: account.id, userId: user.id });
  await insertImport(db, { accountId: account.id, userId: user.id });

  const result = await listImportsService(asDb(db), user.id, 2);

  expect(result).toHaveLength(2);
});
