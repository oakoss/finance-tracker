import { createColumnHelper } from '@tanstack/react-table';

import type { ImportListItem } from '@/modules/imports/api/list-imports';

import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatRelativeTime } from '@/lib/i18n/date';
import { m } from '@/paraglide/messages';

const columnHelper = createColumnHelper<ImportListItem>();

const statusVariant = {
  completed: 'success',
  failed: 'destructive',
  pending: 'secondary',
  processing: 'info',
} as const;

const statusLabel: Record<keyof typeof statusVariant, () => string> = {
  completed: () => m['imports.status.completed'](),
  failed: () => m['imports.status.failed'](),
  pending: () => m['imports.status.pending'](),
  processing: () => m['imports.status.processing'](),
};

export const importColumns = [
  columnHelper.accessor('fileName', {
    cell: ({ getValue }) => <span className="font-medium">{getValue()}</span>,
    header: () => m['imports.columns.file'](),
    meta: {
      headerTitle: m['imports.columns.file'](),
      skeleton: <Skeleton className="h-4 w-32" />,
    },
    size: 200,
  }),
  columnHelper.accessor('accountName', {
    cell: ({ getValue }) => (
      <span className="text-muted-foreground">{getValue() ?? '—'}</span>
    ),
    header: () => m['imports.columns.account'](),
    meta: {
      headerTitle: m['imports.columns.account'](),
      skeleton: <Skeleton className="h-4 w-24" />,
    },
    size: 180,
  }),
  columnHelper.accessor('status', {
    cell: ({ getValue }) => {
      const status = getValue();
      const variant = statusVariant[status] ?? 'secondary';
      const label = statusLabel[status]?.() ?? status;
      return <Badge variant={variant}>{label}</Badge>;
    },
    header: () => m['imports.columns.status'](),
    meta: {
      headerTitle: m['imports.columns.status'](),
      skeleton: <Skeleton className="h-5 w-20" />,
    },
    size: 120,
  }),
  columnHelper.accessor('rowCount', {
    cell: ({ getValue }) => (
      <span className="text-muted-foreground">{getValue() ?? 0}</span>
    ),
    header: () => m['imports.columns.rows'](),
    meta: {
      headerTitle: m['imports.columns.rows'](),
      skeleton: <Skeleton className="h-4 w-12" />,
    },
    size: 80,
  }),
  columnHelper.accessor('importedAt', {
    cell: ({ getValue }) => {
      const val = getValue();
      return (
        <span className="text-muted-foreground">
          {val ? formatRelativeTime({ value: new Date(val) }) : '—'}
        </span>
      );
    },
    header: () => m['imports.columns.date'](),
    meta: {
      headerTitle: m['imports.columns.date'](),
      skeleton: <Skeleton className="h-4 w-20" />,
    },
    size: 140,
  }),
];
