// oxlint-disable typescript/no-deprecated -- @tanstack/react-table v9 legacy compat layer
import {
  getCoreRowModel,
  getPaginationRowModel,
  useLegacyTable,
} from '@tanstack/react-table/legacy';
import { useMemo } from 'react';

import type { TransactionListItem } from '@/modules/transactions/api/list-transactions';

import { DataGrid, DataGridContainer } from '@/components/data-grid';
import { DataGridPagination } from '@/components/data-grid/pagination';
import { DataGridTable } from '@/components/data-grid/table';
import { createTransactionColumns } from '@/modules/transactions/components/transactions-columns';

type TransactionsDataGridProps = {
  data: TransactionListItem[];
  isLoading?: boolean;
};

export function TransactionsDataGrid({
  data,
  isLoading,
}: TransactionsDataGridProps) {
  const columns = useMemo(() => createTransactionColumns(), []);

  const table = useLegacyTable({
    columns,
    data,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      columnPinning: { end: ['actions'], start: ['description'] },
      pagination: { pageIndex: 0, pageSize: 25 },
    },
  });

  return (
    <DataGrid
      isLoading={isLoading}
      loadingMode="skeleton"
      recordCount={data.length}
      table={table}
    >
      <DataGridContainer>
        <DataGridTable />
        {data.length > 25 && <DataGridPagination />}
      </DataGridContainer>
    </DataGrid>
  );
}
