import {
  type ColumnDef,
  columnPinningFeature,
  type createColumnHelper,
  type ReactTable,
  rowSortingFeature,
  tableFeatures,
} from '@tanstack/react-table';

import type { DataGridProps } from '@/components/data-grid';

import {
  createDataGridColumnHelper,
  createDataGridFeatures,
  type DataGridFeatures,
} from '@/components/data-grid/features';

// The scoping win of the `columnMeta` slot is invisible to runtime tests. v9's
// `ExtractColumnMeta` prefers the slot but falls back to the global
// declaration-merged `ColumnMeta` interface, so reintroducing a
// `declare module '@tanstack/table-core'` augmentation would silently make the
// grid's meta fields global again with every runtime test still passing.

type Row = { id: string; name: string };
type Other = { sku: string };

const plainFeatures = tableFeatures({ columnPinningFeature });

type PlainMeta = NonNullable<ColumnDef<typeof plainFeatures, Row>['meta']>;
type GridMeta = NonNullable<ColumnDef<DataGridFeatures<Row>, Row>['meta']>;

describe('data grid column meta', () => {
  it('stays off feature sets that did not register the slot', () => {
    expectTypeOf<PlainMeta>().not.toHaveProperty('skeleton');
    expectTypeOf<PlainMeta>().not.toHaveProperty('expandedContent');
  });

  it('is available on the grid feature set', () => {
    expectTypeOf<GridMeta>().toHaveProperty('skeleton');
    expectTypeOf<GridMeta>().toHaveProperty('headerTitle');
  });

  it('binds expandedContent to the row type the grid is built over', () => {
    expectTypeOf<NonNullable<GridMeta['expandedContent']>>()
      .parameter(0)
      .toEqualTypeOf<Row>();
  });

  it('does not treat feature sets over different row types as interchangeable', () => {
    expectTypeOf<DataGridFeatures<Other>>().not.toEqualTypeOf<
      DataGridFeatures<Row>
    >();
  });
});

// A grid needing an extra feature must not have to add it to every other grid.
// The provider erases TFeatures behind a cast, so reverting `DataGridProps` to
// a non-generic type would break nothing else in the tree.
const supersetFeatures = {
  ...createDataGridFeatures<Row>(),
  rowSortingFeature,
};

describe('data grid feature boundary', () => {
  it('binds the shared column helper to the grid feature set', () => {
    expectTypeOf(createDataGridColumnHelper<Row>()).toEqualTypeOf<
      ReturnType<typeof createColumnHelper<DataGridFeatures<Row>, Row>>
    >();
  });

  it('accepts a table built from a superset feature set', () => {
    expectTypeOf<
      DataGridProps<Row, typeof supersetFeatures>['table']
    >().toEqualTypeOf<ReactTable<typeof supersetFeatures, Row>>();
  });
});
