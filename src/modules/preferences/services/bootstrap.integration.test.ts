import { eq } from 'drizzle-orm';

import type { Db } from '@/db';

import { userPreferences } from '@/modules/preferences/db/schema';
import {
  bootstrapUserPreferences,
  DEFAULT_USER_PREFERENCES,
} from '@/modules/preferences/services/bootstrap';
import type { Db as TestDb } from '~test/factories/base';
import { insertUser } from '~test/factories/user.factory';
import { test } from '~test/integration-setup';

const asDb = (db: TestDb) => db as unknown as Db;

test('bootstrapUserPreferences — creates row with schema defaults', async ({
  serviceDb,
}) => {
  const user = await insertUser(serviceDb);

  const prefs = await bootstrapUserPreferences(asDb(serviceDb), user.id);

  expect(prefs.userId).toBe(user.id);
  expect(prefs.defaultCurrency).toBe(DEFAULT_USER_PREFERENCES.defaultCurrency);
  expect(prefs.locale).toBe(DEFAULT_USER_PREFERENCES.locale);
  expect(prefs.timeZone).toBe(DEFAULT_USER_PREFERENCES.timeZone);
  expect(prefs.createdById).toBe(user.id);
});

test('bootstrapUserPreferences — idempotent: returns same row on repeat call', async ({
  serviceDb,
}) => {
  const user = await insertUser(serviceDb);

  const first = await bootstrapUserPreferences(asDb(serviceDb), user.id);
  const second = await bootstrapUserPreferences(asDb(serviceDb), user.id);

  expect(first.userId).toBe(second.userId);
  expect(first.createdAt.getTime()).toBe(second.createdAt.getTime());

  const rows = await serviceDb
    .select()
    .from(userPreferences)
    .where(eq(userPreferences.userId, user.id));
  expect(rows).toHaveLength(1);
});

test('bootstrapUserPreferences — preserves existing row if prefs already set', async ({
  serviceDb,
}) => {
  const user = await insertUser(serviceDb);
  await serviceDb
    .insert(userPreferences)
    .values({
      createdById: user.id,
      defaultCurrency: 'EUR',
      locale: 'de-DE',
      timeZone: 'Europe/Berlin',
      userId: user.id,
    });

  const prefs = await bootstrapUserPreferences(asDb(serviceDb), user.id);

  expect(prefs.defaultCurrency).toBe('EUR');
  expect(prefs.locale).toBe('de-DE');
  expect(prefs.timeZone).toBe('Europe/Berlin');
});
