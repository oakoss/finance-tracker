import { reset } from 'drizzle-seed';

import type { Db } from '~test/factories/base';

import * as schema from '@/db/schema';

export async function resetDatabase(db: Db): Promise<void> {
  await reset(db, schema);
}
