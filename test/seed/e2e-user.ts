import { hashPassword } from 'better-auth/crypto';
import { eq } from 'drizzle-orm';

import { accounts, users } from '@/db/schema';
import {
  E2E_EMAIL,
  E2E_PASSWORD,
  e2eDisplayName,
  e2eEmail,
} from '~e2e/fixtures/constants';
import type { Db } from '~test/factories/base';

export async function seedE2eUser(
  db: Db,
  email = E2E_EMAIL,
  name = 'E2E Test User',
): Promise<void> {
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing.length > 0) {
    const credential = await db
      .select({ id: accounts.id })
      .from(accounts)
      .where(eq(accounts.userId, existing[0].id))
      .limit(1);

    if (credential.length === 0) {
      throw new Error(
        `E2E user ${email} exists but has no credential account. ` +
          'Run "pnpm docker:reset && pnpm db:seed e2e" to fix.',
      );
    }

    console.log(`E2E user already exists: ${email}`);
    return;
  }

  const hashedPassword = await hashPassword(E2E_PASSWORD);

  const [user] = await db
    .insert(users)
    .values({
      email,
      emailVerified: true,
      name,
    })
    .returning({ id: users.id });

  if (!user) {
    throw new Error(
      `Failed to create E2E user: insert returned no rows for ${email}`,
    );
  }

  await db.insert(accounts).values({
    accountId: user.id,
    password: hashedPassword,
    providerId: 'credential',
    userId: user.id,
  });

  console.log(`Created E2E user: ${email}`);
}

/** Seed one E2E user per worker index (0 to count-1). */
export async function seedE2eWorkerUsers(db: Db, count: number): Promise<void> {
  for (let i = 0; i < count; i++) {
    try {
      await seedE2eUser(db, e2eEmail(i), e2eDisplayName(i));
    } catch (error) {
      throw new Error(
        `Failed to seed worker user ${i}/${count} (${e2eEmail(i)}).` +
          (i > 0
            ? ` Workers 0-${i - 1} may have been created successfully.`
            : ''),
        { cause: error },
      );
    }
  }
}
