 
/* oxlint-disable eslint/no-console */
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

const db = drizzle({
  connection: {
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 10_000,
  },
});

try {
  await migrate(db, { migrationsFolder: './drizzle' });
} catch (error) {
  console.error('Migration failed:', error);
  process.exitCode = 1;
} finally {
  await db.$client.end();
}
