import { drizzle } from 'drizzle-orm/node-postgres';
import { ENV } from 'varlock/env';

import * as schema from './schema.ts';

export const db = drizzle(ENV.DATABASE_URL, { casing: 'snake_case', schema });

export type Db = typeof db;

export type DbOrTx = Pick<Db, 'insert' | 'select'>;

// Full transaction client — use when a helper needs the relational query
// API (`tx.query`), .execute(), .update(), or .delete() that DbOrTx omits.
export type DbTx = Parameters<Parameters<Db['transaction']>[0]>[0];
