import { timestamp, uuid } from 'drizzle-orm/pg-core';

import { users } from '@/modules/auth/db/schema';

export const auditFields = {
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  createdById: uuid().references(() => users.id, { onDelete: 'set null' }),
  deletedAt: timestamp({ withTimezone: true }),
  deletedById: uuid().references(() => users.id, { onDelete: 'set null' }),
  updatedAt: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  updatedById: uuid().references(() => users.id, { onDelete: 'set null' }),
};
