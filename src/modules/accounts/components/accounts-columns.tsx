import { createColumnHelper } from '@tanstack/react-table';

import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/i18n';
import type { AccountListItem } from '@/modules/accounts/api/list-accounts';
import { AccountRowActions } from '@/modules/accounts/components/account-row-actions';
import { AccountTypeBadge } from '@/modules/accounts/components/account-type-badge';
import { m } from '@/paraglide/messages';

const columnHelper = createColumnHelper<AccountListItem>();

export const accountColumns = [
  columnHelper.accessor('account.name', {
    cell: ({ getValue }) => <span className="font-medium">{getValue()}</span>,
    header: () => m['accounts.columns.name'](),
    meta: {
      headerTitle: m['accounts.columns.name'](),
      skeleton: <Skeleton className="h-4 w-32" />,
    },
    size: 200,
  }),
  columnHelper.accessor('account.type', {
    cell: ({ getValue }) => <AccountTypeBadge type={getValue()} />,
    header: () => m['accounts.columns.type'](),
    meta: {
      headerTitle: m['accounts.columns.type'](),
      skeleton: <Skeleton className="h-5 w-20" />,
    },
    size: 140,
  }),
  columnHelper.accessor('account.institution', {
    cell: ({ getValue }) => (
      <span className="text-muted-foreground">{getValue() ?? '--'}</span>
    ),
    header: () => m['accounts.columns.institution'](),
    meta: {
      headerTitle: m['accounts.columns.institution'](),
      skeleton: <Skeleton className="h-4 w-24" />,
    },
    size: 180,
  }),
  columnHelper.accessor('latestBalanceCents', {
    cell: ({ getValue, row }) => {
      const cents = getValue();
      const formatted =
        cents !== null && cents !== undefined
          ? formatCurrency({
              amountCents: cents,
              currency: row.original.account.currency,
            })
          : '--';
      const isNegative = cents !== null && cents !== undefined && cents < 0;
      return (
        <span className={isNegative ? 'text-destructive' : ''}>
          {formatted}
        </span>
      );
    },
    header: () => m['accounts.columns.balance'](),
    meta: {
      cellClassName: 'text-right',
      headerClassName: 'text-right',
      headerTitle: m['accounts.columns.balance'](),
      skeleton: <Skeleton className="ml-auto h-4 w-20" />,
    },
    size: 140,
  }),
  columnHelper.accessor('account.status', {
    cell: ({ getValue }) => {
      const status = getValue();
      return (
        <Badge variant={status === 'active' ? 'success' : 'secondary'}>
          {status === 'active'
            ? m['accounts.status.active']()
            : m['accounts.status.closed']()}
        </Badge>
      );
    },
    header: () => m['accounts.columns.status'](),
    meta: {
      headerTitle: m['accounts.columns.status'](),
      skeleton: <Skeleton className="h-5 w-16" />,
    },
    size: 100,
  }),
  columnHelper.display({
    cell: ({ row }) => <AccountRowActions row={row.original} />,
    id: 'actions',
    meta: {
      cellClassName: 'text-right',
      headerClassName: 'text-right',
      skeleton: <Skeleton className="ml-auto size-7" />,
    },
    size: 60,
  }),
];
