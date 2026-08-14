import {
  columnOrderingFeature,
  columnPinningFeature,
  columnResizingFeature,
  columnSizingFeature,
  columnVisibilityFeature,
  createPaginatedRowModel,
  rowExpandingFeature,
  rowPaginationFeature,
  rowSelectionFeature,
  tableFeatures,
} from '@tanstack/react-table';

/**
 * v9 exposes an API only when its feature is registered, so this is the exact
 * surface `DataGridTable` and `DataGridPagination` call into. Anything added to
 * those components needs its feature added here first.
 *
 * Non-obvious dependencies: `columnResizingFeature` requires
 * `columnSizingFeature`, and the pinned-cell offsets in `getPinningStyles`
 * (`column.getStart` / `getAfter`) come from sizing rather than pinning.
 *
 * The core row model is built automatically and needs no registration.
 * Expansion renders custom `meta.expandedContent` rather than sub-rows, so it
 * needs no `expandedRowModel` slot — dropping `paginatedRowModel`, by contrast,
 * silently renders every row instead of erroring.
 */
export const dataGridFeatures = tableFeatures({
  // `getIndex` / `getIsFirstColumn` / `getIsLastColumn` come from ordering, not
  // pinning — the edge-cell and pinned-divider styling in `table.tsx` needs it.
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

export type DataGridFeatures = typeof dataGridFeatures;
