'use client';

// oxlint-disable typescript/no-deprecated -- @tanstack/react-table v9 legacy compat layer
import type { ColumnFiltersState, SortingState } from '@tanstack/react-table';
import type {
  LegacyColumn,
  LegacyReactTable,
} from '@tanstack/react-table/legacy';
import type { CellData, RowData, TableFeatures } from '@tanstack/table-core';

import { createContext, type ReactNode, use } from 'react';

import { cn } from '@/lib/utils';

// v9 declares ColumnMeta in table-core and only re-exports it from
// react-table, so the augmentation has to target the declaring module.
declare module '@tanstack/table-core' {
  interface ColumnMeta<
    in out TFeatures extends TableFeatures,
    in out TData extends RowData,
    TValue extends CellData = CellData,
  > {
    headerTitle?: string;
    headerClassName?: string;
    cellClassName?: string;
    skeleton?: ReactNode;
    expandedContent?: (row: TData) => ReactNode;
  }
}

export type DataGridColumnMeta<TData extends RowData> = {
  cellClassName?: string;
  expandedContent?: (row: TData) => ReactNode;
  headerClassName?: string;
  headerTitle?: string;
  skeleton?: ReactNode;
};

export type DataGridApiFetchParams = {
  filters?: ColumnFiltersState;
  pageIndex: number;
  pageSize: number;
  searchQuery?: string;
  sorting?: SortingState;
};

export type DataGridApiResponse<T> = {
  data: T[];
  empty: boolean;
  pagination: { page: number; total: number };
};

export type DataGridContextProps<TData extends RowData> = {
  isLoading: boolean;
  props: DataGridProps<TData>;
  recordCount: number;
  table: LegacyReactTable<TData>;
};

export type DataGridRequestParams = {
  columnFilters?: ColumnFiltersState;
  pageIndex: number;
  pageSize: number;
  sorting?: SortingState;
};

export type DataGridProps<TData extends RowData> = {
  children?: ReactNode;
  className?: string;
  emptyMessage?: ReactNode | string;
  isLoading?: boolean | undefined;
  loadingMessage?: ReactNode | string;
  loadingMode?: 'skeleton' | 'spinner';
  onRowClick?: (row: TData) => void;
  recordCount: number;
  table?: LegacyReactTable<TData>;
  tableClassNames?: {
    base?: string;
    body?: string;
    bodyRow?: string;
    edgeCell?: string;
    footer?: string;
    header?: string;
    headerRow?: string;
    headerSticky?: string;
  };
  tableLayout?: {
    cellBorder?: boolean;
    columnsDraggable?: boolean;
    columnsMovable?: boolean;
    columnsPinnable?: boolean;
    columnsResizable?: boolean;
    columnsVisibility?: boolean;
    dense?: boolean;
    headerBackground?: boolean;
    headerBorder?: boolean;
    headerSticky?: boolean;
    rowBorder?: boolean;
    rowRounded?: boolean;
    rowsDraggable?: boolean;
    stripped?: boolean;
    width?: 'auto' | 'fixed';
  };
};

const DataGridContext = createContext<DataGridContextProps<any> | undefined>(
  undefined,
);

function useDataGrid() {
  const context = use(DataGridContext);
  if (!context) {
    throw new Error('useDataGrid must be used within a DataGridProvider');
  }
  return context;
}

function DataGridProvider<TData extends RowData>({
  children,
  table,
  ...props
}: DataGridProps<TData> & { table: LegacyReactTable<TData> }) {
  return (
    <DataGridContext
      value={{
        isLoading: props.isLoading ?? false,
        props,
        recordCount: props.recordCount,
        // v9's table type is invariant in TData, so widening to the context's
        // erased `any` needs an explicit cast.
        table: table as LegacyReactTable<any>,
      }}
    >
      {children}
    </DataGridContext>
  );
}

function DataGrid<TData extends RowData>({
  children,
  table,
  ...props
}: DataGridProps<TData>) {
  const defaultProps: Partial<DataGridProps<TData>> = {
    loadingMode: 'skeleton',
    tableClassNames: {
      base: '',
      body: '',
      bodyRow: '',
      edgeCell: '',
      footer: '',
      header: '',
      headerRow: '',
      headerSticky: 'sticky top-0 z-10 bg-background/90 backdrop-blur-xs',
    },
    tableLayout: {
      cellBorder: false,
      columnsDraggable: false,
      columnsMovable: false,
      columnsPinnable: true,
      columnsResizable: false,
      columnsVisibility: false,
      dense: false,
      headerBackground: true,
      headerBorder: true,
      headerSticky: false,
      rowBorder: true,
      rowRounded: false,
      rowsDraggable: false,
      stripped: false,
      width: 'fixed',
    },
  };

  const mergedProps: DataGridProps<TData> = {
    ...defaultProps,
    ...props,
    tableClassNames: {
      ...defaultProps.tableClassNames,
      ...props.tableClassNames,
    },
    tableLayout: { ...defaultProps.tableLayout, ...props.tableLayout },
  };

  // Ensure table is provided
  if (!table) {
    throw new Error('DataGrid requires a "table" prop');
  }

  return (
    <DataGridProvider table={table} {...mergedProps}>
      {children}
    </DataGridProvider>
  );
}

function DataGridContainer({
  border = true,
  children,
  className,
}: {
  border?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'w-full overflow-x-auto',
        border && 'rounded-xl border border-border',
        className,
      )}
      data-slot="data-grid"
    >
      {children}
    </div>
  );
}

function getColumnMeta<TData extends RowData, TValue>(
  column: LegacyColumn<TData, TValue>,
) {
  return column.columnDef.meta;
}

export {
  DataGrid,
  DataGridContainer,
  DataGridProvider,
  getColumnMeta,
  useDataGrid,
};
