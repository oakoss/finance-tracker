import { useTable } from '@tanstack/react-table';

import type { AccountListItem } from '@/modules/accounts/api/list-accounts';

import { DataGrid, DataGridContainer } from '@/components/data-grid';
import { createDataGridFeatures } from '@/components/data-grid/features';
import { DataGridPagination } from '@/components/data-grid/pagination';
import { DataGridTable } from '@/components/data-grid/table';
import { accountColumns } from '@/modules/accounts/components/accounts-columns';

const features = createDataGridFeatures<AccountListItem>();

type AccountsDataGridProps = { data: AccountListItem[]; isLoading?: boolean };

export function AccountsDataGrid({ data, isLoading }: AccountsDataGridProps) {
  const table = useTable({
    columns: accountColumns,
    data,
    features,
    initialState: {
      columnPinning: { end: ['actions'], start: ['account_name'] },
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
