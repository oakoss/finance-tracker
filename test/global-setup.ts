import { config } from '@dotenvx/dotenvx';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { reset } from 'drizzle-seed';
import pg from 'pg';

import * as schema from '@/db/schema';

const TEST_DB_NAME = 'finance_tracker_test';

export async function setup() {
  // Load .env so DATABASE_URL is available
  config({ convention: 'flow', quiet: true });

  const originalUrl = process.env.DATABASE_URL;
  if (!originalUrl) throw new Error('DATABASE_URL is not set');

  // Parse the original URL and swap the DB name to the test DB
  const url = new URL(originalUrl);
  const maintenanceDb = url.pathname.slice(1); // original DB name
  url.pathname = `/${TEST_DB_NAME}`;
  const testUrl = url.toString();

  // Connect to the maintenance DB to create the test DB (idempotent)
  url.pathname = `/${maintenanceDb}`;
  const client = new pg.Client({ connectionString: url.toString() });
  try {
    await client.connect();
    await client.query(`CREATE DATABASE ${TEST_DB_NAME}`);
    console.log(`Created database: ${TEST_DB_NAME}`);
  } catch (error: unknown) {
    // 42P04 = duplicate_database — already exists, that's fine
    if ((error as { code?: string }).code !== '42P04') throw error;
    console.log(`Database ${TEST_DB_NAME} already exists`);
  } finally {
    await client.end().catch((error: unknown) => {
      console.warn('[test-setup] Failed to close maintenance client:', error);
    });
  }

  // Rewrite DATABASE_URL to point at the test DB
  process.env.DATABASE_URL = testUrl;

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
      `Failed to run migrations against ${TEST_DB_NAME}. ` +
        `Ensure ./drizzle folder exists and DATABASE_URL is reachable.`,
    );
    throw error;
  } finally {
    await migrationClient.end().catch((error: unknown) => {
      console.warn('[test-setup] Failed to close migration client:', error);
    });
  }
}
