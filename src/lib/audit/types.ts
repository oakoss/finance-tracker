import type { auditActionEnum } from '@/modules/finance/db/schema';

export type AuditAction = (typeof auditActionEnum)['enumValues'][number];
