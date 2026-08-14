import { useTable } from '@tanstack/react-table';
import { useMemo } from 'react';

import type { TransactionListItem } from '@/modules/transactions/api/list-transactions';

import { DataGrid, DataGridContainer } from '@/components/data-grid';
import { createDataGridFeatures } from '@/components/data-grid/features';
import { DataGridPagination } from '@/components/data-grid/pagination';
import { DataGridTable } from '@/components/data-grid/table';
import { createTransactionColumns } from '@/modules/transactions/components/transactions-columns';

const features = createDataGridFeatures<TransactionListItem>();

type TransactionsDataGridProps = {
  data: TransactionListItem[];
  isLoading?: boolean;
};

export function TransactionsDataGrid({
  data,
  isLoading,
}: TransactionsDataGridProps) {
  const columns = useMemo(() => createTransactionColumns(), []);

  const table = useTable({
    columns,
    data,
    features,
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
