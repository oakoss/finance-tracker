import { eq } from 'drizzle-orm';

import type { Db } from '@/db';

import { auditLogs } from '@/db/audit';
import { userPreferences } from '@/modules/preferences/db/schema';
import { updateUserPreferencesService } from '@/modules/preferences/services/update-preferences';
import type { Db as TestDb } from '~test/factories/base';
import { insertUser } from '~test/factories/user.factory';
import { test } from '~test/integration-setup';

const asDb = (db: TestDb) => db as unknown as Db;

const input = {
  defaultCurrency: 'EUR',
  locale: 'de-DE',
  timeZone: 'Europe/Berlin',
};

test('updateUserPreferencesService — upserts when no row exists', async ({
  serviceDb,
}) => {
  const user = await insertUser(serviceDb);

  const result = await updateUserPreferencesService(
    asDb(serviceDb),
    user.id,
    input,
  );

  expect(result.defaultCurrency).toBe('EUR');
  expect(result.locale).toBe('de-DE');
  expect(result.timeZone).toBe('Europe/Berlin');
  expect(result.userId).toBe(user.id);

  const rows = await serviceDb
    .select()
    .from(userPreferences)
    .where(eq(userPreferences.userId, user.id));
  expect(rows).toHaveLength(1);
});

test('updateUserPreferencesService — updates existing row in place', async ({
  serviceDb,
}) => {
  const user = await insertUser(serviceDb);
  const [initial] = await serviceDb
    .insert(userPreferences)
    .values({ createdById: user.id, userId: user.id })
    .returning();
  // Ensure enough clock separation for updatedAt comparison.
  await new Promise((resolve) => {
    setTimeout(resolve, 5);
  });

  const result = await updateUserPreferencesService(
    asDb(serviceDb),
    user.id,
    input,
  );

  expect(result.defaultCurrency).toBe('EUR');
  expect(result.locale).toBe('de-DE');
  expect(result.timeZone).toBe('Europe/Berlin');
  expect(result.updatedById).toBe(user.id);
  expect(result.updatedAt.getTime()).toBeGreaterThan(
    initial.updatedAt.getTime(),
  );

  const rows = await serviceDb
    .select()
    .from(userPreferences)
    .where(eq(userPreferences.userId, user.id));
  expect(rows).toHaveLength(1);
});

test('updateUserPreferencesService — writes create audit log on first upsert', async ({
  serviceDb,
}) => {
  const user = await insertUser(serviceDb);

  await updateUserPreferencesService(asDb(serviceDb), user.id, input);

  const logs = await serviceDb
    .select()
    .from(auditLogs)
    .where(eq(auditLogs.recordId, user.id));
  expect(logs).toHaveLength(1);
  expect(logs[0]?.action).toBe('create');
  expect(logs[0]?.tableName).toBe('user_preferences');
});

test('updateUserPreferencesService — writes update audit log with beforeData on second upsert', async ({
  serviceDb,
}) => {
  const user = await insertUser(serviceDb);

  await updateUserPreferencesService(asDb(serviceDb), user.id, input);
  await updateUserPreferencesService(asDb(serviceDb), user.id, {
    ...input,
    defaultCurrency: 'GBP',
  });

  const logs = await serviceDb
    .select()
    .from(auditLogs)
    .where(eq(auditLogs.recordId, user.id));
  expect(logs).toHaveLength(2);
  expect(logs[1]?.action).toBe('update');
  expect(logs[1]?.beforeData).not.toBeNull();
});

test('updateUserPreferencesService — rejects invalid time zone', async ({
  serviceDb,
}) => {
  const user = await insertUser(serviceDb);

  await expect(
    updateUserPreferencesService(asDb(serviceDb), user.id, {
      ...input,
      timeZone: 'Not/A_Zone',
    }),
  ).rejects.toThrow(/time zone/i);
});

test('updateUserPreferencesService — rejects invalid locale', async ({
  serviceDb,
}) => {
  const user = await insertUser(serviceDb);

  await expect(
    updateUserPreferencesService(asDb(serviceDb), user.id, {
      ...input,
      locale: 'not-a-locale!!!',
    }),
  ).rejects.toThrow(/locale/i);
});
