import 'varlock/auto-load';

import { defineConfig } from 'drizzle-kit';

const url = process.env.DATABASE_URL;
if (!url)
  throw new Error(
    'DATABASE_URL is not set. Check .env.local / varlock schema.',
  );

export default defineConfig({
  casing: 'snake_case',
  dbCredentials: { url },
  dialect: 'postgresql',
  out: './drizzle',
  schema: './src/db/schema.ts',
});
