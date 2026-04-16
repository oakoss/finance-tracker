import { faker } from '@faker-js/faker';
import { drizzle } from 'drizzle-orm/node-postgres';

import * as schema from '@/db/schema';
import { FAKER_SEED } from '~test/factories/base';
import { insertTransactionWithRelations } from '~test/factories/transaction-with-relations.factory';
import { createMonthlySpending } from '~test/scenarios/monthly-spending';
import { createMultiAccountUser } from '~test/scenarios/multi-account-user';
import { seedBaseCategories } from '~test/seed/base-categories';
import { seedCreditCardCatalog } from '~test/seed/credit-card-catalog';
import { seedE2eUser } from '~test/seed/e2e-user';
import { resetDatabase } from '~test/seed/reset';

type Profile = 'e2e' | 'minimal' | 'standard' | 'stress';

const VALID_PROFILES = new Set<Profile>([
  'e2e',
  'minimal',
  'standard',
  'stress',
]);

function getProfile(): Profile {
  const arg = process.argv[2] as Profile | undefined;
  if (arg && VALID_PROFILES.has(arg)) return arg;
  return 'standard';
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL is required');
    process.exit(1);
  }

  faker.seed(FAKER_SEED);
  const db = drizzle(databaseUrl, { casing: 'snake_case', schema });
  const profile = getProfile();

  console.log(`Seeding database with profile: ${profile}`);

  console.log('Resetting database...');
  await resetDatabase(db);

  await seedCreditCardCatalog(db);

  if (profile === 'e2e') {
    try {
      await seedE2eUser(db);
      console.log('E2E seed complete');
    } catch (error) {
      console.error('E2E seed failed:', error);
      console.error(
        'Hint: run "pnpm docker:reset" then retry "pnpm db:seed e2e"',
      );
      process.exit(1);
    }
    process.exit(0);
  }

  if (profile === 'minimal') {
    const ctx = await insertTransactionWithRelations(db, {
      account: { type: 'checking' },
      category: { type: 'expense' },
      withCategory: true,
      withPayee: true,
    });
    await seedBaseCategories(db, ctx.user.id);
    console.log('Created: 1 full transaction chain + base categories');
  }

  if (profile === 'standard' || profile === 'stress') {
    const fullTxn = await insertTransactionWithRelations(db, {
      account: { type: 'checking' },
      category: { type: 'expense' },
      withCategory: true,
      withPayee: true,
    });
    await seedBaseCategories(db, fullTxn.user.id);

    const multiAcct = await createMultiAccountUser(db);
    await seedBaseCategories(db, multiAcct.user.id);

    const monthly = await createMonthlySpending(db);
    await seedBaseCategories(db, monthly.user.id);

    console.log(
      'Created: full transaction + multi-account user + monthly spending + base categories',
    );
  }

  if (profile === 'stress') {
    for (let i = 0; i < 9; i++) {
      const ctx = await createMonthlySpending(db);
      await seedBaseCategories(db, ctx.user.id);
    }
    console.log('Created: 9 additional monthly spending scenarios');
  }

  console.log('Seeding complete!');
  process.exit(0);
}

void main();
