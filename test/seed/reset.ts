import { reset } from 'drizzle-seed';

import * as schema from '@/db/schema';
import type { Db } from '~test/factories/base';

export async function resetDatabase(db: Db): Promise<void> {
  await reset(db, schema);
}
