import type { drizzle } from 'drizzle-orm/node-postgres';

import { eq } from 'drizzle-orm';

import * as schema from '@/db/schema';

/**
 * Wipe transactional data owned by an E2E user across the four
 * top-level user-owned tables; FK cascades handle child rows. Runs
 * inside a transaction so a mid-cleanup failure can't leave the
 * worker in a half-wiped state. Used by suite setup and the
 * `clean-data` E2E fixture.
 */
export async function cleanE2eUserData(
  db: ReturnType<typeof drizzle>,
  email: string,
): Promise<void> {
  const [user] = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.email, email))
    .limit(1);

  if (!user) {
    throw new Error(
      `[e2e-cleanup] user not found (${email}). ` +
        'Run pnpm db:seed e2e or pnpm test:e2e to re-seed worker users.',
    );
  }

  await db.transaction(async (tx) => {
    await tx.delete(schema.imports).where(eq(schema.imports.userId, user.id));
    await tx
      .delete(schema.ledgerAccounts)
      .where(eq(schema.ledgerAccounts.userId, user.id));
    await tx
      .delete(schema.budgetPeriods)
      .where(eq(schema.budgetPeriods.userId, user.id));
    await tx
      .delete(schema.categories)
      .where(eq(schema.categories.userId, user.id));
  });
}
