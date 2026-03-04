import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from 'drizzle-arktype';

import { auditLogs } from '@/db/audit';

export const auditLogsSelectSchema = createSelectSchema(auditLogs);
export const auditLogsInsertSchema = createInsertSchema(auditLogs);
export const auditLogsUpdateSchema = createUpdateSchema(auditLogs);
export const auditLogsDeleteSchema = auditLogsSelectSchema.pick('id');

export type AuditLog = typeof auditLogsSelectSchema.infer;
export type AuditLogInsert = typeof auditLogsInsertSchema.infer;
