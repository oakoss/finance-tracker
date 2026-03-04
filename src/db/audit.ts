import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

import { users } from '@/modules/auth/db/schema';

export const auditActionEnum = pgEnum('audit_action', [
  'create',
  'update',
  'delete',
]);

export const auditLogs = pgTable(
  'audit_logs',
  {
    action: auditActionEnum().notNull(),
    actorId: uuid().references(() => users.id, { onDelete: 'set null' }),
    afterData: jsonb(),
    beforeData: jsonb(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    id: uuid()
      .primaryKey()
      .default(sql`uuidv7()`),
    recordId: uuid().notNull(),
    tableName: text().notNull(),
  },
  (table) => [
    index('audit_logs_actor_id_idx').on(table.actorId),
    index('audit_logs_table_name_idx').on(table.tableName),
    index('audit_logs_record_id_idx').on(table.recordId),
  ],
);
