import 'varlock/auto-load';

import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { reset } from 'drizzle-seed';
import pg from 'pg';

import * as schema from '@/db/schema';

export async function setup() {
  const testUrl = process.env.DATABASE_URL;
  if (!testUrl) throw new Error('DATABASE_URL is not set');

  // Derive the test DB name and connect to the default postgres DB
  // to run CREATE DATABASE (requires a postgres DB on the server)
  const url = new URL(testUrl);
  const testDbName = url.pathname.slice(1);
  url.pathname = '/postgres';
  const maintenanceUrl = url.toString();

  // Create the test DB (idempotent) via the default postgres DB
  const client = new pg.Client({ connectionString: maintenanceUrl });
  try {
    await client.connect();
    await client.query(`CREATE DATABASE "${testDbName}"`);
    console.log(`Created database: ${testDbName}`);
  } catch (error: unknown) {
    // 42P04 = duplicate_database — already exists, that's fine
    if ((error as { code?: string }).code !== '42P04') throw error;
    console.log(`Database ${testDbName} already exists`);
  } finally {
    await client.end().catch((error: unknown) => {
      console.warn('[test-setup] Failed to close maintenance client:', error);
    });
  }

  // Run migrations then reset all schema tables for a clean baseline.
  // Individual test files use BEGIN/ROLLBACK so nothing commits during
  // the run, but stale data from previous runs must be cleared once.
  const migrationClient = new pg.Client({ connectionString: testUrl });
  try {
    await migrationClient.connect();
    const db = drizzle(migrationClient, { casing: 'snake_case', schema });
    await migrate(db, { migrationsFolder: './drizzle' });
    console.log('Migrations applied to test database');

    await reset(db, schema);
    console.log('Reset all schema tables');
  } catch (error) {
    console.error(
      `Failed to run migrations against ${testDbName}. ` +
        `Ensure ./drizzle folder exists and DATABASE_URL is reachable.`,
    );
    throw error;
  } finally {
    await migrationClient.end().catch((error: unknown) => {
      console.warn('[test-setup] Failed to close migration client:', error);
    });
  }
}
