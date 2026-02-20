import { config } from '@dotenvx/dotenvx';
import { defineConfig } from 'drizzle-kit';

config({ convention: 'flow', quiet: true });

export default defineConfig({
  out: './drizzle',
  schema: './src/db/schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  casing: 'snake_case',
});
