import { config } from '@dotenvx/dotenvx';
import { defineConfig } from 'drizzle-kit';

config({ convention: 'flow', quiet: true });

export default defineConfig({
  casing: 'snake_case',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  dialect: 'postgresql',
  out: './drizzle',
  schema: './src/db/schema.ts',
});
