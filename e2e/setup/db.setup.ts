import { config } from '@dotenvx/dotenvx';
import { test as setup } from '@playwright/test';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';

import * as schema from '@/db/schema';
import { E2E_USER_COUNT, e2eEmail } from '~e2e/fixtures/constants';
import { seedCreditCardCatalog } from '~test/seed/credit-card-catalog';
import { seedE2eUser, seedE2eWorkerUsers } from '~test/seed/e2e-user';

config({ convention: 'flow', quiet: true });

/**
 * Wipe ledger accounts and categories owned by an E2E user so every
 * suite run starts from a clean slate. FK cascades handle child rows
 * (transactions, transaction_tags, account_terms, balance_snapshots).
 */
async function cleanE2eUserData(
  db: ReturnType<typeof drizzle>,
  email: string,
): Promise<void> {
  const [user] = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.email, email))
    .limit(1);

  if (!user) {
    console.warn(`[db.setup] E2E user not found (${email}), skipping cleanup`);
    return;
  }

  await db.delete(schema.imports).where(eq(schema.imports.userId, user.id));
  await db
    .delete(schema.ledgerAccounts)
    .where(eq(schema.ledgerAccounts.userId, user.id));
  await db
    .delete(schema.budgetPeriods)
    .where(eq(schema.budgetPeriods.userId, user.id));
  await db
    .delete(schema.categories)
    .where(eq(schema.categories.userId, user.id));
}

// oxlint-disable-next-line playwright/expect-expect -- pure DB seed, no browser assertions
setup('ensure e2e seed data', async () => {
  const databaseUrl = process.env.DATABASE_URL;
  // oxlint-disable-next-line playwright/no-conditional-in-test -- env precondition, not test logic
  if (!databaseUrl) throw new Error('DATABASE_URL is not set');

  const db = drizzle(databaseUrl, { casing: 'snake_case', schema });
  try {
    await seedCreditCardCatalog(db);
    await seedE2eUser(db);
    await seedE2eWorkerUsers(db, E2E_USER_COUNT);
    for (let i = 0; i < E2E_USER_COUNT; i++) {
      await cleanE2eUserData(db, e2eEmail(i));
    }
  } finally {
    await db.$client.end();
  }
});
