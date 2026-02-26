import { isNull } from 'drizzle-orm';
import type { PgColumn } from 'drizzle-orm/pg-core';

export function notDeleted(deletedAtColumn: PgColumn) {
  return isNull(deletedAtColumn);
}
