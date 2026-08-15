import assert from 'node:assert';

import type { Db } from '@/db';

import { DEFAULT_USER_PREFERENCES } from '@/modules/preferences/services/bootstrap';
import { fetchUserPreferences } from '@/modules/preferences/services/fetch-preferences';
import { asDb } from '~test/db';
import { insertUser } from '~test/factories/user.factory';
import { test } from '~test/integration-setup';

test('fetchUserPreferences — happy path returns persisted row with isDefault: false', async ({
  serviceDb,
}) => {
  const user = await insertUser(serviceDb);

  const result = await fetchUserPreferences(asDb(serviceDb), user.id);

  assert.ok(!result.isDefault);
  expect(result.preferences.userId).toBe(user.id);
  expect(result.preferences.defaultCurrency).toBe(
    DEFAULT_USER_PREFERENCES.defaultCurrency,
  );
});

test('fetchUserPreferences — returns in-memory defaults with isDefault: true when bootstrap fails', async () => {
  // Stub implements only `insert`/`query`, so a single hop to `Db` cannot check.
  // oxlint-disable-next-line type-evidence/no-chained-type-assertions
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
