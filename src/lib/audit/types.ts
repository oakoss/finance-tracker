import type { auditActionEnum } from '@/db/audit';

export type AuditAction = (typeof auditActionEnum)['enumValues'][number];

export type AuditTableName =
  | 'budget_lines'
  | 'budget_periods'
  | 'categories'
  | 'deletion_requests'
  | 'imports'
  | 'ledger_accounts'
  | 'merchant_rules'
  | 'rule_runs'
  | 'transactions'
  | 'user_preferences';
