import { useTable } from '@tanstack/react-table';

import type { ImportRowItem } from '@/modules/imports/api/list-import-rows';

import { DataGrid, DataGridContainer } from '@/components/data-grid';
import { dataGridFeatures } from '@/components/data-grid/features';
import { DataGridPagination } from '@/components/data-grid/pagination';
import { DataGridTable } from '@/components/data-grid/table';
import {
  importRowColumns,
  type ImportRowTableMeta,
} from '@/modules/imports/components/import-rows-columns';
import {
  useUpdateImportRowData,
  useUpdateImportRowStatus,
} from '@/modules/imports/hooks/use-imports';

type ImportRowsDataGridProps = { data: ImportRowItem[] };

export function ImportRowsDataGrid({ data }: ImportRowsDataGridProps) {
  const statusMutation = useUpdateImportRowStatus();
  const dataMutation = useUpdateImportRowData();

  const meta: ImportRowTableMeta = {
    onStatusChange: (rowId, status) =>
      statusMutation.mutate({ id: rowId, status }),
    onUpdateData: (rowId, normalizedData) =>
      dataMutation.mutate({ id: rowId, normalizedData }),
  };

  const table = useTable({
    columns: importRowColumns,
    data,
    features: dataGridFeatures,
    getRowId: (row) => row.id,
    initialState: { pagination: { pageIndex: 0, pageSize: 50 } },
    meta,
  });

  return (
    <DataGrid loadingMode="skeleton" recordCount={data.length} table={table}>
      <DataGridContainer>
        <DataGridTable />
        {data.length > 50 && <DataGridPagination />}
      </DataGridContainer>
    </DataGrid>
  );
}
