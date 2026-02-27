import { hashPassword } from 'better-auth/crypto';
import { eq } from 'drizzle-orm';

import type { Db } from '~test/factories/base';

import { accounts, users } from '@/db/schema';

const E2E_EMAIL = process.env.E2E_USER_EMAIL ?? 'e2e@test.local';
const E2E_PASSWORD = process.env.E2E_USER_PASSWORD ?? 'E2ePassword1!';

export async function seedE2eUser(db: Db): Promise<void> {
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, E2E_EMAIL))
    .limit(1);

  if (existing.length > 0) {
    const credential = await db
      .select({ id: accounts.id })
      .from(accounts)
      .where(eq(accounts.userId, existing[0].id))
      .limit(1);

    if (credential.length === 0) {
      throw new Error(
        `E2E user ${E2E_EMAIL} exists but has no credential account. ` +
          'Run "pnpm docker:reset && pnpm db:seed e2e" to fix.',
      );
    }

    console.log(`E2E user already exists: ${E2E_EMAIL}`);
    return;
  }

  const hashedPassword = await hashPassword(E2E_PASSWORD);

  const [user] = await db
    .insert(users)
    .values({
      email: E2E_EMAIL,
      emailVerified: true,
      name: 'E2E Test User',
    })
    .returning({ id: users.id });

  if (!user) {
    throw new Error(
      `Failed to create E2E user: insert returned no rows for ${E2E_EMAIL}`,
    );
  }

  await db.insert(accounts).values({
    accountId: user.id,
    password: hashedPassword,
    providerId: 'credential',
    userId: user.id,
  });

  console.log(`Created E2E user: ${E2E_EMAIL}`);
}
