import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';

import * as schema from '@/db/schema';

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
