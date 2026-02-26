/* eslint-disable unicorn/no-process-exit */
import { faker } from '@faker-js/faker';
import { drizzle } from 'drizzle-orm/node-postgres';

import * as schema from '@/db/schema';
import { FAKER_SEED } from '~test/factories/base';
import { createFullTransaction } from '~test/scenarios/full-transaction';
import { createMonthlySpending } from '~test/scenarios/monthly-spending';
import { createMultiAccountUser } from '~test/scenarios/multi-account-user';
import { resetDatabase } from '~test/seed/reset';

type Profile = 'minimal' | 'standard' | 'stress';

const VALID_PROFILES = new Set<Profile>(['minimal', 'standard', 'stress']);

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

  if (profile === 'minimal') {
    await createFullTransaction(db);
    console.log('Created: 1 full transaction chain');
  }

  if (profile === 'standard' || profile === 'stress') {
    await createFullTransaction(db);
    await createMultiAccountUser(db);
    await createMonthlySpending(db);
    console.log(
      'Created: full transaction + multi-account user + monthly spending',
    );
  }

  if (profile === 'stress') {
    for (let i = 0; i < 9; i++) {
      await createMonthlySpending(db);
    }
    console.log('Created: 9 additional monthly spending scenarios');
  }

  console.log('Seeding complete!');
  process.exit(0);
}

void main();
