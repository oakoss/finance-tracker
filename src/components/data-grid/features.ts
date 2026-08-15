import type { ReactNode } from 'react';

import {
  columnOrderingFeature,
  columnPinningFeature,
  columnResizingFeature,
  columnSizingFeature,
  columnVisibilityFeature,
  createColumnHelper,
  createPaginatedRowModel,
  metaHelper,
  type RowData,
  rowExpandingFeature,
  rowPaginationFeature,
  rowSelectionFeature,
  tableFeatures,
} from '@tanstack/react-table';

export type DataGridColumnMeta<TData extends RowData> = {
  cellClassName?: string;
  expandedContent?: (row: TData) => ReactNode;
  headerClassName?: string;
  /**
   * Plain-string column name, for anywhere a label is needed outside the header
   * cell — `header` returns a ReactNode and cannot be reused as text. Nothing
   * reads it today: its consumer was the column-visibility menu, removed with
   * the orphaned column-header control.
   */
  headerTitle?: string;
  skeleton?: ReactNode;
};

/**
 * v9 exposes an API only when its feature is registered, so this is the exact
 * surface `DataGridTable` and `DataGridPagination` call into. Anything added to
 * those components needs its feature added here first.
 *
 * This is a factory rather than a constant because the `columnMeta` slot is
 * generic over the row type. The slot keeps the meta contract scoped to grids
 * built from it, where a global `ColumnMeta` augmentation would put these
 * fields on every table in the app.
 *
 * Non-obvious dependencies: `columnResizingFeature` requires
 * `columnSizingFeature`, and the pinned-cell offsets in `getPinningStyles`
 * (`column.getStart` / `getAfter`) come from sizing rather than pinning.
 *
 * The core row model is built automatically and needs no registration.
 * Expansion renders custom `meta.expandedContent` rather than sub-rows, so it
 * needs no `expandedRowModel` slot — dropping `paginatedRowModel`, by contrast,
 * silently renders every row instead of erroring.
 *
 * Call this at module level. `useTable` binds the feature APIs once inside its
 * `useState` initializer and caches each row model on first access, so a
 * per-render call yields a set that later renders ignore rather than erroring.
 */
export function createDataGridFeatures<TData extends RowData>() {
  return tableFeatures({
    columnMeta: metaHelper<DataGridColumnMeta<TData>>(),
    // `getIndex` / `getIsFirstColumn` / `getIsLastColumn` come from ordering,
    // not pinning — the edge and pinned-divider styling in `table.tsx` needs it.
    columnOrderingFeature,
    columnPinningFeature,
    columnResizingFeature,
    columnSizingFeature,
    columnVisibilityFeature,
    paginatedRowModel: createPaginatedRowModel(),
    rowExpandingFeature,
    rowPaginationFeature,
    rowSelectionFeature,
  });
}

export type DataGridFeatures<TData extends RowData> = ReturnType<
  typeof createDataGridFeatures<TData>
>;

/**
 * Binds a column helper to the grid's feature set so columns files name the row
 * type once instead of repeating it alongside `DataGridFeatures`.
 */
export function createDataGridColumnHelper<TData extends RowData>() {
  return createColumnHelper<DataGridFeatures<TData>, TData>();
}
