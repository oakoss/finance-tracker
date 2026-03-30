import 'varlock/auto-load';

import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { reset } from 'drizzle-seed';
import pg from 'pg';
import { ENV } from 'varlock/env';

import * as schema from '@/db/schema';

export async function setup() {
  if (ENV.APP_ENV !== 'test') {
    throw new Error(
      `Refusing to run integration setup with APP_ENV="${ENV.APP_ENV}". Set APP_ENV=test to avoid wiping the dev database.`,
    );
  }

  const testUrl = process.env.DATABASE_URL;
  if (!testUrl) throw new Error('DATABASE_URL is not set');

  const dbName = ENV.DB_NAME;
  const maintenanceUrl = `postgres://${ENV.DB_USER}:${ENV.DB_PASSWORD}@${ENV.DB_HOST}:${ENV.DB_PORT}/postgres`;

  // Connect to the default postgres DB to create the test DB (idempotent)
  const client = new pg.Client({ connectionString: maintenanceUrl });
  try {
    await client.connect();
    await client.query(`CREATE DATABASE "${dbName}"`);
    console.log(`Created database: ${dbName}`);
  } catch (error: unknown) {
    // 42P04 = duplicate_database — already exists, that's fine
    if ((error as { code?: string }).code !== '42P04') throw error;
    console.log(`Database ${dbName} already exists`);
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
      `Failed to run migrations against ${dbName}. ` +
        `Ensure ./drizzle folder exists and DATABASE_URL is reachable.`,
    );
    throw error;
  } finally {
    await migrationClient.end().catch((error: unknown) => {
      console.warn('[test-setup] Failed to close migration client:', error);
    });
  }
}
