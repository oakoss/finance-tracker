import type { AuditAction } from '@/lib/audit/types';

import { log } from '@/lib/logging/evlog';
import { hashId } from '@/lib/logging/hash';

export function logAuditEvent(params: {
  action: AuditAction;
  actorId: string;
  entityId: string;
  tableName: string;
}): void {
  try {
    log.info({
      action: `${params.tableName}.${params.action}`,
      audit: {
        entity: params.tableName,
        entityIdHash: hashId(params.entityId),
        operation: params.action,
      },
      user: { idHash: hashId(params.actorId) },
    });
  } catch (error) {
    try {
      log.warn({
        action: 'audit.log.failed',
        error: error instanceof Error ? error.message : String(error),
      });
    } catch (innerError) {
      // eslint-disable-next-line no-console -- evlog is broken; last resort
      console.error('[audit] logging system failure:', innerError);
    }
  }
}
