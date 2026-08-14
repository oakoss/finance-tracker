import { useNavigate } from '@tanstack/react-router';
import { useTable } from '@tanstack/react-table';

import type { ImportListItem } from '@/modules/imports/api/list-imports';

import { DataGrid, DataGridContainer } from '@/components/data-grid';
import { dataGridFeatures } from '@/components/data-grid/features';
import { DataGridPagination } from '@/components/data-grid/pagination';
import { DataGridTable } from '@/components/data-grid/table';
import { importColumns } from '@/modules/imports/components/imports-columns';

type ImportsDataGridProps = { data: ImportListItem[]; isLoading?: boolean };

export function ImportsDataGrid({ data, isLoading }: ImportsDataGridProps) {
  const navigate = useNavigate();

  const table = useTable({
    columns: importColumns,
    data,
    features: dataGridFeatures,
    initialState: { pagination: { pageIndex: 0, pageSize: 25 } },
  });

  return (
    <DataGrid
      isLoading={isLoading}
      loadingMode="skeleton"
      recordCount={data.length}
      table={table}
      onRowClick={(row) =>
        void navigate({
          params: { importId: row.id },
          to: '/imports/$importId',
        })
      }
    >
      <DataGridContainer>
        <DataGridTable />
        {data.length > 25 && <DataGridPagination />}
      </DataGridContainer>
    </DataGrid>
  );
}
