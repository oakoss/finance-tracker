import type { Db } from '@/db';

import { fetchUserPreferences } from '@/modules/preferences/api/get-preferences';
import { DEFAULT_USER_PREFERENCES } from '@/modules/preferences/services/bootstrap';
import type { Db as TestDb } from '~test/factories/base';
import { insertUser } from '~test/factories/user.factory';
import { test } from '~test/integration-setup';

const asDb = (db: TestDb) => db as unknown as Db;

test('fetchUserPreferences — happy path returns persisted row with isDefault: false', async ({
  serviceDb,
}) => {
  const user = await insertUser(serviceDb);

  const result = await fetchUserPreferences(asDb(serviceDb), user.id);

  expect(result.isDefault).toBe(false);
  if (!result.isDefault) {
    expect(result.preferences.userId).toBe(user.id);
    expect(result.preferences.defaultCurrency).toBe(
      DEFAULT_USER_PREFERENCES.defaultCurrency,
    );
  }
});

test('fetchUserPreferences — returns in-memory defaults with isDefault: true when bootstrap fails', async () => {
  const throwingDb = {
    insert: () => {
      throw new Error('simulated connection failure');
    },
    query: {
      userPreferences: {
        findFirst: () => {
          throw new Error('simulated connection failure');
        },
      },
    },
  } as unknown as Db;

  const result = await fetchUserPreferences(throwingDb, 'user_test_id');

  expect(result.isDefault).toBe(true);
  expect(result.preferences).toEqual(DEFAULT_USER_PREFERENCES);
});
