import type { DbOrTx } from '@/db';
import type { AuditAction } from '@/lib/audit/types';

import { auditLogs } from '@/db/audit';
import { logAuditEvent } from '@/lib/audit/log-audit-event';

type InsertAuditLogParams = {
  action: AuditAction;
  actorId: string;
  afterData?: Record<string, unknown>;
  beforeData?: Record<string, unknown>;
  entityId: string;
  tableName: string;
};

export async function insertAuditLog(
  tx: DbOrTx,
  params: InsertAuditLogParams,
): Promise<void> {
  await tx
    .insert(auditLogs)
    .values({
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
