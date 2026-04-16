import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

const db = drizzle({
  connection: {
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 10_000,
    statement_timeout: 120_000,
  },
});

try {
  await migrate(db, { migrationsFolder: './drizzle' });
  console.log('Migrations completed.');
} catch (error) {
  console.error('Migration failed:', error);
  process.exitCode = 1;
} finally {
  try {
    await db.$client.end();
  } catch {
    // cleanup failure is non-fatal
  }
}
