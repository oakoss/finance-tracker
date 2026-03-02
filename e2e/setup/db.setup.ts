import { config } from '@dotenvx/dotenvx';
import { test as setup } from '@playwright/test';
import { drizzle } from 'drizzle-orm/node-postgres';

import * as schema from '@/db/schema';
import { seedCreditCardCatalog } from '~test/seed/credit-card-catalog';
import { seedE2eUser } from '~test/seed/e2e-user';

config({ convention: 'flow', quiet: true });

// eslint-disable-next-line playwright/expect-expect -- pure DB seed, no browser assertions
setup('ensure e2e seed data', async () => {
  const databaseUrl = process.env.DATABASE_URL;
  // eslint-disable-next-line playwright/no-conditional-in-test -- env precondition, not test logic
  if (!databaseUrl) throw new Error('DATABASE_URL is not set');

  const db = drizzle(databaseUrl, {
    casing: 'snake_case',
    schema,
  });
  try {
    await seedCreditCardCatalog(db);
    await seedE2eUser(db);
  } finally {
    await db.$client.end();
  }
});
