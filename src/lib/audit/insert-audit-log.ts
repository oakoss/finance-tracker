import type { Db } from '@/db';
import { logAuditEvent } from '@/lib/audit/log-audit-event';
import type { AuditAction } from '@/lib/audit/types';
import { auditLogs } from '@/modules/finance/db/schema';

type InsertAuditLogParams = {
  action: AuditAction;
  actorId: string;
  afterData?: Record<string, unknown>;
  beforeData?: Record<string, unknown>;
  entityId: string;
  tableName: string;
};

export async function insertAuditLog(
  tx: Db,
  params: InsertAuditLogParams,
): Promise<void> {
  await tx.insert(auditLogs).values({
    action: params.action,
    actorId: params.actorId,
    afterData: params.afterData,
    beforeData: params.beforeData,
    recordId: params.entityId,
    tableName: params.tableName,
  });

  logAuditEvent({
    action: params.action,
    actorId: params.actorId,
    entityId: params.entityId,
    tableName: params.tableName,
  });
}
