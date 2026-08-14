// oxlint-disable typescript/no-deprecated -- @tanstack/react-table v9 legacy compat layer
import {
  getCoreRowModel,
  getPaginationRowModel,
  useLegacyTable,
} from '@tanstack/react-table/legacy';
import { useMemo } from 'react';

import type { CategoryListItem } from '@/modules/categories/api/list-categories';

import { DataGrid, DataGridContainer } from '@/components/data-grid';
import { DataGridPagination } from '@/components/data-grid/pagination';
import { DataGridTable } from '@/components/data-grid/table';
import { createCategoryColumns } from '@/modules/categories/components/categories-columns';

type CategoriesDataGridProps = {
  data: CategoryListItem[];
  isLoading?: boolean;
};

export function CategoriesDataGrid({
  data,
  isLoading,
}: CategoriesDataGridProps) {
  const columns = useMemo(() => createCategoryColumns(data), [data]);

  const table = useLegacyTable({
    columns,
    data,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      columnPinning: { end: ['actions'], start: ['name'] },
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
