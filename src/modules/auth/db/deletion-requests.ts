import { sql } from 'drizzle-orm';
import { index, pgEnum, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';

import { users } from '@/modules/auth/db/schema';

export const deletionRequestStatusEnum = pgEnum('deletion_request_status', [
  'cancelled',
  'pending',
]);

export const deletionRequests = pgTable(
  'deletion_requests',
  {
    cancelledAt: timestamp({ withTimezone: true }),
    id: uuid()
      .primaryKey()
      .default(sql`uuidv7()`),
    initiatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    purgeAfter: timestamp({ withTimezone: true }).notNull(),
    status: deletionRequestStatusEnum().notNull().default('pending'),
    userId: uuid()
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: 'cascade' }),
  },
  (table) => [
    index('deletion_requests_purge_idx').on(table.purgeAfter, table.status),
  ],
);
