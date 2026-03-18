import {
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';

import type { ImportListItem } from '@/modules/imports/api/list-imports';

import { DataGrid, DataGridContainer } from '@/components/data-grid';
import { DataGridPagination } from '@/components/data-grid/pagination';
import { DataGridTable } from '@/components/data-grid/table';
import { importColumns } from '@/modules/imports/components/imports-columns';

type ImportsDataGridProps = { data: ImportListItem[]; isLoading?: boolean };

export function ImportsDataGrid({ data, isLoading }: ImportsDataGridProps) {
  // oxlint-disable-next-line react-compiler/incompatible-library -- TanStack Table API is Compiler-incompatible by design
  const table = useReactTable({
    columns: importColumns,
    data,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageIndex: 0, pageSize: 25 } },
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
