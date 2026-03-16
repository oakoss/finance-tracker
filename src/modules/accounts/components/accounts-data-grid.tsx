import {
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';

import type { AccountListItem } from '@/modules/accounts/api/list-accounts';

import { DataGrid, DataGridContainer } from '@/components/data-grid';
import { DataGridPagination } from '@/components/data-grid/pagination';
import { DataGridTable } from '@/components/data-grid/table';
import { accountColumns } from '@/modules/accounts/components/accounts-columns';

type AccountsDataGridProps = {
  data: AccountListItem[];
  isLoading?: boolean;
};

export function AccountsDataGrid({ data, isLoading }: AccountsDataGridProps) {
  // oxlint-disable-next-line react-compiler/incompatible-library -- TanStack Table API is Compiler-incompatible by design
  const table = useReactTable({
    columns: accountColumns,
    data,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      columnPinning: { left: ['account_name'], right: ['actions'] },
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
