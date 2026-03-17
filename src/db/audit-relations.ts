import { relations } from 'drizzle-orm';

import { auditLogs } from '@/db/audit';
import { users } from '@/modules/auth/db/schema';

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  actor: one(users, { fields: [auditLogs.actorId], references: [users.id] }),
}));
