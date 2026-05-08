import type { AuditAction, AuditTableName } from '@/lib/audit/types';

import { log } from '@/lib/logging/evlog';
import { hashId } from '@/lib/logging/hash';

export function logAuditEvent(params: {
  action: AuditAction;
  actorId: string;
  entityId: string;
  tableName: AuditTableName;
}): void {
  try {
    const action = `${params.tableName}.${params.action}`;
    const actorIdHash = hashId(params.actorId);
    log.info({
      action,
      audit: {
        action,
        actor: { id: actorIdHash, type: 'user' },
        outcome: 'success',
        target: { id: hashId(params.entityId), type: params.tableName },
      },
      user: { idHash: actorIdHash },
    });
  } catch (error) {
    try {
      log.warn({
        action: 'audit.log.failed',
        auditAction: params.action,
        error: error instanceof Error ? error.message : String(error),
        tableName: params.tableName,
      });
    } catch (innerError) {
      // evlog itself has failed; console is the last resort
      console.error('[audit] logging system failure:', innerError);
    }
  }
}
