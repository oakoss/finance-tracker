import { createColumnHelper, useTable } from '@tanstack/react-table';
import { renderHook } from '@testing-library/react';

import {
  createDataGridFeatures,
  type DataGridFeatures,
} from '@/components/data-grid/features';

// Covers the parts of the feature registration that typecheck cannot show:
// a missing `paginatedRowModel` slot renders every row rather than erroring,
// pinned-cell offsets collapse to 0 when the position argument is wrong, and
// `columnDef.meta` surviving v9's column-def resolution is a runtime contract.

type Row = { extra: string; id: string; name: string };

const rows: Row[] = Array.from({ length: 60 }, (_, index) => ({
  extra: `extra-${index}`,
  id: String(index),
  name: `row-${index}`,
}));

const columnHelper = createColumnHelper<DataGridFeatures<Row>, Row>();

const columns = columnHelper.columns([
  columnHelper.accessor('id', { id: 'id', size: 100 }),
  columnHelper.accessor('name', { id: 'name', size: 150 }),
  columnHelper.accessor('extra', {
    id: 'extra',
    meta: { cellClassName: 'text-right', skeleton: 'loading' },
    size: 200,
  }),
]);

const features = createDataGridFeatures<Row>();

describe('createDataGridFeatures', () => {
  it('paginates instead of returning every row', () => {
    const { result } = renderHook(() =>
      useTable({
        columns,
        data: rows,
        features,
        initialState: { pagination: { pageIndex: 0, pageSize: 25 } },
      }),
    );

    expect(result.current.getRowModel().rows).toHaveLength(25);
    expect(result.current.getPageCount()).toBe(3);
    expect(result.current.getCanNextPage()).toBe(true);
    expect(result.current.getCanPreviousPage()).toBe(false);
  });

  it('exposes the pagination slice on table.state', () => {
    const { result } = renderHook(() =>
      useTable({
        columns,
        data: rows,
        features,
        initialState: { pagination: { pageIndex: 1, pageSize: 10 } },
      }),
    );

    expect(result.current.state.pagination).toEqual({
      pageIndex: 1,
      pageSize: 10,
    });
  });

  it('resolves column pinning to logical start/end', () => {
    const { result } = renderHook(() =>
      useTable({
        columns,
        data: rows,
        features,
        initialState: { columnPinning: { end: ['extra'], start: ['name'] } },
      }),
    );

    expect(result.current.getColumn('name')?.getIsPinned()).toBe('start');
    expect(result.current.getColumn('extra')?.getIsPinned()).toBe('end');
  });

  it('orders visible cells with pinned columns first', () => {
    const { result } = renderHook(() =>
      useTable({
        columns,
        data: rows,
        features,
        initialState: { columnPinning: { end: [], start: ['name'] } },
      }),
    );

    const cellIds = result.current
      .getRowModel()
      .rows[0]?.getVisibleCells()
      .map((cell) => cell.column.id);

    expect(cellIds).toEqual(['name', 'id', 'extra']);
  });

  // `getStart`/`getAfter` take an optional position and fall back to 0 for an
  // unrecognized region, so a single pinned column per side passes either way.
  it('accumulates pinned offsets across multiple columns per side', () => {
    const { result } = renderHook(() =>
      useTable({
        columns,
        data: rows,
        features,
        initialState: { columnPinning: { end: [], start: ['id', 'name'] } },
      }),
    );

    expect(result.current.getColumn('id')?.getStart('start')).toBe(0);
    expect(result.current.getColumn('name')?.getStart('start')).toBe(100);
  });

  it('accumulates end-pinned offsets in reverse', () => {
    const { result } = renderHook(() =>
      useTable({
        columns,
        data: rows,
        features,
        initialState: { columnPinning: { end: ['name', 'extra'], start: [] } },
      }),
    );

    expect(result.current.getColumn('extra')?.getAfter('end')).toBe(0);
    expect(result.current.getColumn('name')?.getAfter('end')).toBe(200);
  });

  it('keeps columnDef.meta readable off the constructed table', () => {
    const { result } = renderHook(() =>
      useTable({ columns, data: rows, features }),
    );

    const meta = result.current.getColumn('extra')?.columnDef.meta;

    expect(meta?.cellClassName).toBe('text-right');
    expect(meta?.skeleton).toBe('loading');
  });
});
