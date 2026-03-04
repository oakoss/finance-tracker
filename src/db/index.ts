import { drizzle } from 'drizzle-orm/node-postgres';

import { env } from '@/configs/env';

import * as schema from './schema.ts';

export const db = drizzle(env.DATABASE_URL, {
  casing: 'snake_case',
  schema,
});

export type Db = typeof db;

export type DbOrTx = Pick<Db, 'insert' | 'select'>;
