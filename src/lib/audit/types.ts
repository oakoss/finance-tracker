import type { auditActionEnum } from '@/db/audit';

export type AuditAction = (typeof auditActionEnum)['enumValues'][number];
