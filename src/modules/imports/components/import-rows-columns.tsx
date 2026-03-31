import { createColumnHelper } from '@tanstack/react-table';

import type { ImportRowItem } from '@/modules/imports/api/list-import-rows';
import type { ProcessedNormalizedRow } from '@/modules/imports/lib/apply-column-mapping';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EditableCell } from '@/modules/imports/components/editable-cell';
import { m } from '@/paraglide/messages';

export type ImportRowTableMeta = {
  onStatusChange: (rowId: string, status: 'ignored' | 'mapped') => void;
  onUpdateData: (rowId: string, data: Partial<ProcessedNormalizedRow>) => void;
};

const columnHelper = createColumnHelper<ImportRowItem>();

const rowStatusVariant = {
  committed: 'success',
  duplicate: 'warning',
  error: 'destructive',
  ignored: 'secondary',
  mapped: 'info',
} as const;

const rowStatusLabel: Record<keyof typeof rowStatusVariant, () => string> = {
  committed: () => m['imports.detail.rowStatus.committed'](),
  duplicate: () => m['imports.detail.rowStatus.duplicate'](),
  error: () => m['imports.detail.rowStatus.error'](),
  ignored: () => m['imports.detail.rowStatus.ignored'](),
  mapped: () => m['imports.detail.rowStatus.mapped'](),
};

function formatCents(value: string): string {
  const cents = Number(value);
  if (Number.isNaN(cents)) return value;
  return (cents / 100).toFixed(2);
}

function parseDollars(value: string): number | null {
  const cleaned = value.replaceAll(/[^0-9.-]/g, '');
  const dollars = Number.parseFloat(cleaned);
  if (Number.isNaN(dollars)) return null;
  return Math.round(dollars * 100);
}

export const importRowColumns = [
  columnHelper.accessor('rowIndex', {
    cell: ({ getValue }) => (
      <span className="text-muted-foreground">{getValue() + 1}</span>
    ),
    header: () => m['imports.detail.columns.row'](),
    meta: { skeleton: <Skeleton className="h-4 w-8" /> },
    size: 50,
  }),
  columnHelper.display({
    cell: ({ row, table }) => {
      const nd = row.original.normalizedData;
      const meta = table.options.meta as ImportRowTableMeta;
      const editable = row.original.status === 'mapped';
      return (
        <EditableCell
          disabled={!editable}
          value={nd?.description ?? ''}
          onSave={(v) => meta.onUpdateData(row.original.id, { description: v })}
        />
      );
    },
    header: () => m['imports.detail.columns.description'](),
    id: 'description',
    meta: { skeleton: <Skeleton className="h-4 w-40" /> },
    size: 200,
  }),
  columnHelper.display({
    cell: ({ row, table }) => {
      const nd = row.original.normalizedData;
      const meta = table.options.meta as ImportRowTableMeta;
      const editable = row.original.status === 'mapped';
      return (
        <EditableCell
          className="font-mono tabular-nums"
          disabled={!editable}
          formatDisplay={formatCents}
          value={String(nd?.amountCents ?? '')}
          onSave={(v) => {
            const cents = parseDollars(v);
            if (cents !== null) {
              meta.onUpdateData(row.original.id, { amountCents: cents });
            }
          }}
        />
      );
    },
    header: () => m['imports.detail.columns.amount'](),
    id: 'amount',
    meta: { skeleton: <Skeleton className="h-4 w-20" /> },
    size: 120,
  }),
  columnHelper.display({
    cell: ({ row, table }) => {
      const nd = row.original.normalizedData;
      const meta = table.options.meta as ImportRowTableMeta;
      const editable = row.original.status === 'mapped';
      return (
        <EditableCell
          disabled={!editable}
          value={nd?.transactionAt ?? ''}
          onSave={(v) =>
            meta.onUpdateData(row.original.id, { transactionAt: v })
          }
        />
      );
    },
    header: () => m['imports.detail.columns.date'](),
    id: 'date',
    meta: { skeleton: <Skeleton className="h-4 w-24" /> },
    size: 120,
  }),
  columnHelper.display({
    cell: ({ row, table }) => {
      const nd = row.original.normalizedData;
      const meta = table.options.meta as ImportRowTableMeta;
      const editable = row.original.status === 'mapped';
      return (
        <EditableCell
          disabled={!editable}
          value={nd?.categoryName ?? ''}
          onSave={(v) =>
            meta.onUpdateData(row.original.id, { categoryName: v })
          }
        />
      );
    },
    header: () => m['imports.detail.columns.category'](),
    id: 'category',
    meta: { skeleton: <Skeleton className="h-4 w-24" /> },
    size: 140,
  }),
  columnHelper.display({
    cell: ({ row, table }) => {
      const nd = row.original.normalizedData;
      const meta = table.options.meta as ImportRowTableMeta;
      const editable = row.original.status === 'mapped';
      return (
        <EditableCell
          disabled={!editable}
          value={nd?.payeeName ?? ''}
          onSave={(v) => meta.onUpdateData(row.original.id, { payeeName: v })}
        />
      );
    },
    header: () => m['imports.detail.columns.payee'](),
    id: 'payee',
    meta: { skeleton: <Skeleton className="h-4 w-24" /> },
    size: 140,
  }),
  columnHelper.display({
    cell: ({ row, table }) => {
      const nd = row.original.normalizedData;
      const meta = table.options.meta as ImportRowTableMeta;
      const editable = row.original.status === 'mapped';
      return (
        <EditableCell
          disabled={!editable}
          value={nd?.memo ?? ''}
          onSave={(v) => meta.onUpdateData(row.original.id, { memo: v })}
        />
      );
    },
    header: () => m['imports.detail.columns.memo'](),
    id: 'memo',
    meta: { skeleton: <Skeleton className="h-4 w-24" /> },
    size: 160,
  }),
  columnHelper.accessor('status', {
    cell: ({ getValue, row }) => {
      const status = getValue();
      const variant = rowStatusVariant[status] ?? 'secondary';
      const label = rowStatusLabel[status]?.() ?? status;
      const nd = row.original.normalizedData;
      return (
        <div className="flex flex-col gap-1">
          <Badge variant={variant}>{label}</Badge>
          {status === 'error' && nd?.errorReason && (
            <span className="text-xs text-destructive">{nd.errorReason}</span>
          )}
        </div>
      );
    },
    header: () => m['imports.detail.columns.status'](),
    meta: { skeleton: <Skeleton className="h-5 w-16" /> },
    size: 120,
  }),
  columnHelper.display({
    cell: ({ row, table }) => {
      const status = row.original.status;
      const meta = table.options.meta as ImportRowTableMeta;
      if (status !== 'mapped' && status !== 'ignored') return null;
      const isMapped = status === 'mapped';
      return (
        <Button
          size="sm"
          variant="ghost"
          onClick={() =>
            meta.onStatusChange(
              row.original.id,
              isMapped ? 'ignored' : 'mapped',
            )
          }
        >
          {isMapped
            ? m['imports.detail.toggleIgnore']()
            : m['imports.detail.toggleMap']()}
        </Button>
      );
    },
    id: 'actions',
    meta: {
      cellClassName: 'text-right',
      headerClassName: 'text-right',
      skeleton: <Skeleton className="ml-auto h-7 w-16" />,
    },
    size: 80,
  }),
];
