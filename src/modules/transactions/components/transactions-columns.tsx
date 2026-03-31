import { createColumnHelper } from '@tanstack/react-table';

import type { TransactionListItem } from '@/modules/transactions/api/list-transactions';

import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Timestamp } from '@/components/ui/timestamp';
import { formatCurrency } from '@/lib/i18n/number';
import { TransactionRowActions } from '@/modules/transactions/components/transaction-row-actions';
import { m } from '@/paraglide/messages';

const columnHelper = createColumnHelper<TransactionListItem>();

export function createTransactionColumns() {
  return [
    columnHelper.accessor('transactionAt', {
      cell: ({ getValue }) => {
        const value = getValue();
        return value ? <Timestamp value={value} /> : '--';
      },
      header: () => m['transactions.columns.date'](),
      meta: {
        headerTitle: m['transactions.columns.date'](),
        skeleton: <Skeleton className="h-4 w-20" />,
      },
      size: 120,
    }),
    columnHelper.accessor('description', {
      cell: ({ getValue }) => <span className="font-medium">{getValue()}</span>,
      header: () => m['transactions.columns.description'](),
      meta: {
        headerTitle: m['transactions.columns.description'](),
        skeleton: <Skeleton className="h-4 w-40" />,
      },
      size: 240,
    }),
    columnHelper.accessor('accountName', {
      cell: ({ getValue }) => (
        <span className="text-muted-foreground">{getValue()}</span>
      ),
      header: () => m['transactions.columns.account'](),
      meta: {
        headerTitle: m['transactions.columns.account'](),
        skeleton: <Skeleton className="h-4 w-24" />,
      },
      size: 160,
    }),
    columnHelper.accessor('categoryName', {
      cell: ({ getValue, row }) => {
        const name = getValue();
        if (row.original.isSplit) {
          return (
            <Badge variant="secondary">
              {m['transactions.split.label']({
                count: String(row.original.splitLines.length),
              })}
            </Badge>
          );
        }
        return <span className="text-muted-foreground">{name ?? '--'}</span>;
      },
      header: () => m['transactions.columns.category'](),
      meta: {
        headerTitle: m['transactions.columns.category'](),
        skeleton: <Skeleton className="h-4 w-20" />,
      },
      size: 140,
    }),
    columnHelper.accessor('payeeName', {
      cell: ({ getValue }) => {
        const name = getValue();
        return <span className="text-muted-foreground">{name ?? '--'}</span>;
      },
      header: () => m['transactions.columns.payee'](),
      meta: {
        headerTitle: m['transactions.columns.payee'](),
        skeleton: <Skeleton className="h-4 w-24" />,
      },
      size: 160,
    }),
    columnHelper.accessor('amountCents', {
      cell: ({ row }) => {
        const { amountCents, direction } = row.original;
        const isCredit = direction === 'credit';
        return (
          <span
            className={
              isCredit
                ? 'font-medium text-emerald-600 dark:text-emerald-400'
                : 'font-medium'
            }
          >
            {isCredit ? '+' : '-'}
            {formatCurrency({ amountCents })}
          </span>
        );
      },
      header: () => m['transactions.columns.amount'](),
      meta: {
        cellClassName: 'text-right',
        headerClassName: 'text-right',
        headerTitle: m['transactions.columns.amount'](),
        skeleton: <Skeleton className="ml-auto h-4 w-16" />,
      },
      size: 120,
    }),
    columnHelper.accessor('pending', {
      cell: ({ getValue }) =>
        getValue() ? (
          <Badge variant="outline">{m['transactions.pending']()}</Badge>
        ) : null,
      header: () => m['transactions.columns.pending'](),
      meta: {
        headerTitle: m['transactions.columns.pending'](),
        skeleton: <Skeleton className="h-5 w-16" />,
      },
      size: 100,
    }),
    columnHelper.accessor('tags', {
      cell: ({ getValue }) => {
        const tagList = getValue();
        if (!tagList?.length) return null;
        return (
          <div className="flex flex-wrap gap-1">
            {tagList.map((tag) => (
              <Badge key={tag.id} variant="secondary">
                {tag.name}
              </Badge>
            ))}
          </div>
        );
      },
      header: () => m['transactions.columns.tags'](),
      meta: {
        headerTitle: m['transactions.columns.tags'](),
        skeleton: <Skeleton className="h-5 w-20" />,
      },
      size: 160,
    }),
    columnHelper.display({
      cell: ({ row }) => <TransactionRowActions row={row.original} />,
      id: 'actions',
      meta: {
        cellClassName: 'text-right',
        headerClassName: 'text-right',
        skeleton: <Skeleton className="ml-auto size-7" />,
      },
      size: 60,
    }),
  ];
}
