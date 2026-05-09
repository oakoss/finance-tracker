import 'varlock/auto-load';

import { test as setup } from '@playwright/test';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

import * as schema from '@/db/schema';
import { E2E_USER_COUNT, e2eEmail } from '~e2e/fixtures/constants';
import { seedCreditCardCatalog } from '~test/seed/credit-card-catalog';
import { cleanE2eUserData } from '~test/seed/e2e-cleanup';
import { seedE2eUser, seedE2eWorkerUsers } from '~test/seed/e2e-user';

// oxlint-disable-next-line playwright/expect-expect -- pure DB seed, no browser assertions
setup('ensure e2e seed data', async () => {
  const databaseUrl = process.env.DATABASE_URL;
  // oxlint-disable-next-line playwright/no-conditional-in-test -- env precondition, not test logic
  if (!databaseUrl) throw new Error('DATABASE_URL is not set');

  const db = drizzle(databaseUrl, { casing: 'snake_case', schema });
  try {
    // Idempotent: drizzle's migrator tracks applied migrations in
    // __drizzle_migrations and no-ops on a fully-migrated DB.
    // Running it here lets `pnpm test:e2e` work right after a
    // `docker:reset` without a manual migrate step in between.
    await migrate(db, { migrationsFolder: './drizzle' });
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
