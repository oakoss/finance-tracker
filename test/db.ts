import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';

import type { Db } from '@/db';

import * as schema from '@/db/schema';
import type { Db as TestDb } from '~test/factories/base';

/**
 * `TestDb` is the app's `Db` minus `$client`, which services never touch. The
 * assertion stays single-hop so TypeScript still checks the two overlap — if
 * `@/db` changes drivers, this stops compiling instead of failing at runtime.
 */
export const asDb = (db: TestDb) => db as Db;

/**
 * Drizzle instance on a single pg.Client (not a pool).
 * One connection = one session, so the caller can BEGIN/ROLLBACK.
 */
export async function createTestDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');

  const client = new pg.Client({ connectionString: url });
  await client.connect();

  return drizzle(client, { casing: 'snake_case', schema });
}
