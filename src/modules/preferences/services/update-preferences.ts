import type { Db } from '@/db';
import type { UserPreferences } from '@/modules/preferences/models';
import type { UpdateUserPreferencesInput } from '@/modules/preferences/validators';

import { insertAuditLog } from '@/lib/audit/insert-audit-log';
import { createError } from '@/lib/logging/evlog';
import { userPreferences } from '@/modules/preferences/db/schema';

function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch (error) {
    if (error instanceof RangeError) return false;
    throw error;
  }
}

function isValidLocale(locale: string): boolean {
  try {
    return new Intl.Locale(locale).baseName.length > 0;
  } catch (error) {
    if (error instanceof RangeError) return false;
    throw error;
  }
}

export async function updateUserPreferencesService(
  database: Db,
  userId: string,
  data: UpdateUserPreferencesInput,
): Promise<UserPreferences> {
  if (!isValidTimeZone(data.timeZone)) {
    throw createError({
      fix: 'Pick a valid time zone from the list.',
      message: 'Invalid time zone.',
      status: 422,
      why: `"${data.timeZone}" is not a recognized IANA time zone.`,
    });
  }
  if (!isValidLocale(data.locale)) {
    throw createError({
      fix: 'Pick a valid locale from the list.',
      message: 'Invalid locale.',
      status: 422,
      why: `"${data.locale}" is not a recognized BCP 47 locale tag.`,
    });
  }

  return database.transaction(async (tx) => {
    const before = await tx.query.userPreferences.findFirst({
      where: (t, { eq }) => eq(t.userId, userId),
    });

    const [row] = await tx
      .insert(userPreferences)
      .values({
        createdById: userId,
        defaultCurrency: data.defaultCurrency,
        locale: data.locale,
        timeZone: data.timeZone,
        updatedById: userId,
        userId,
      })
      .onConflictDoUpdate({
        set: {
          defaultCurrency: data.defaultCurrency,
          locale: data.locale,
          timeZone: data.timeZone,
          updatedAt: new Date(),
          updatedById: userId,
        },
        target: userPreferences.userId,
      })
      .returning();

    if (!row) {
      throw createError({
        fix: 'Try again. If the problem persists, contact support.',
        message: 'Failed to update preferences.',
        status: 500,
        why: 'Upsert returned no row.',
      });
    }

    const baseAuditParams = {
      actorId: userId,
      afterData: row as unknown as Record<string, unknown>,
      entityId: userId,
      tableName: 'user_preferences',
    };
    await insertAuditLog(
      tx,
      before
        ? {
            ...baseAuditParams,
            action: 'update',
            beforeData: before as unknown as Record<string, unknown>,
          }
        : { ...baseAuditParams, action: 'create' },
    );

    return row;
  });
}
