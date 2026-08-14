import { useTable } from '@tanstack/react-table';
import { renderHook } from '@testing-library/react';

import { dataGridFeatures } from '@/components/data-grid/features';

// v9 only exposes an API when its feature is registered, and a mis-wired
// feature degrades silently — an unpaginated table still renders. These assert
// the registration behaves at runtime, which typecheck alone cannot show.

type Row = { id: string; name: string };

const rows: Row[] = Array.from({ length: 60 }, (_, index) => ({
  id: String(index),
  name: `row-${index}`,
}));

const columns = [
  { accessorKey: 'name', id: 'name' },
  { accessorKey: 'id', id: 'id' },
];

describe('dataGridFeatures', () => {
  it('paginates instead of returning every row', () => {
    const { result } = renderHook(() =>
      useTable({
        columns,
        data: rows,
        features: dataGridFeatures,
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
        features: dataGridFeatures,
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
        features: dataGridFeatures,
        initialState: { columnPinning: { end: ['id'], start: ['name'] } },
      }),
    );

    expect(result.current.getColumn('name')?.getIsPinned()).toBe('start');
    expect(result.current.getColumn('id')?.getIsPinned()).toBe('end');
  });

  it('orders visible cells with pinned columns first', () => {
    const { result } = renderHook(() =>
      useTable({
        columns,
        data: rows,
        features: dataGridFeatures,
        initialState: { columnPinning: { end: [], start: ['id'] } },
      }),
    );

    const cellIds = result.current
      .getRowModel()
      .rows[0]?.getVisibleCells()
      .map((cell) => cell.column.id);

    expect(cellIds).toEqual(['id', 'name']);
  });
});
