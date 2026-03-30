import { drizzle } from 'drizzle-orm/node-postgres';
import { ENV } from 'varlock/env';

import * as schema from './schema.ts';

export const db = drizzle(ENV.DATABASE_URL, { casing: 'snake_case', schema });

export type Db = typeof db;

export type DbOrTx = Pick<Db, 'insert' | 'select'>;
