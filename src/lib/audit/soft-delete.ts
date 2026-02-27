import type { PgColumn } from 'drizzle-orm/pg-core';

import { isNull } from 'drizzle-orm';

export function notDeleted(deletedAtColumn: PgColumn) {
  return isNull(deletedAtColumn);
}
