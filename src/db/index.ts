import { drizzle } from 'drizzle-orm/node-postgres';

import { env } from '@/configs/env';

import * as schema from './schema.ts';

export const db = drizzle(env.DATABASE_URL, {
  schema,
  casing: 'snake_case',
});
