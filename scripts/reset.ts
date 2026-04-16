import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error(
    'DATABASE_URL is not set. Check .env.local or your varlock schema.',
  );
  process.exit(1);
}

const appEnv = process.env.APP_ENV ?? 'development';
const force = process.argv.includes('--force');
const url = new URL(databaseUrl);
const localHosts = new Set(['localhost', '127.0.0.1', 'db']);
const isLocal = localHosts.has(url.hostname);

if ((appEnv === 'production' || !isLocal) && !force) {
  console.error(
    `Refusing to reset ${url.host}${url.pathname} (appEnv=${appEnv}, host=${url.hostname}).`,
  );
  console.error('Pass --force explicitly to confirm destructive reset.');
  process.exit(1);
}

console.log(
  `Resetting schema on ${url.host}${url.pathname} (appEnv=${appEnv})...`,
);

const db = drizzle({ connection: { connectionString: databaseUrl } });

try {
  // Drop both public (app tables) and drizzle (migration history in
  // `drizzle.__drizzle_migrations`). Without the drizzle drop,
  // drizzle-kit migrate sees all migrations as already applied and
  // no-ops, leaving an empty public schema.
  await db.execute(sql`DROP SCHEMA IF EXISTS public CASCADE`);
  await db.execute(sql`DROP SCHEMA IF EXISTS drizzle CASCADE`);
  await db.execute(sql`CREATE SCHEMA public`);
  console.log('Schema reset.');
} catch (error) {
  console.error('Reset failed:', error);
  process.exitCode = 1;
} finally {
  try {
    await db.$client.end();
  } catch {
    // cleanup failure is non-fatal
  }
}
