'use client';

import type {
  Column,
  ColumnFiltersState,
  ReactTable,
  RowData,
  SortingState,
} from '@tanstack/react-table';

import { createContext, type ReactNode, use } from 'react';

import type { DataGridFeatures } from '@/components/data-grid/features';

import { cn } from '@/lib/utils';

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
  // `children` and `table` are destructured out before the rest lands here.
  props: Omit<DataGridProps<TData>, 'children' | 'table'>;
  recordCount: number;
  table: ReactTable<DataGridFeatures<TData>, TData>;
};

export type DataGridRequestParams = {
  columnFilters?: ColumnFiltersState;
  pageIndex: number;
  pageSize: number;
  sorting?: SortingState;
};

export type DataGridProps<
  TData extends RowData,
  TFeatures extends DataGridFeatures<TData> = DataGridFeatures<TData>,
> = {
  children?: ReactNode;
  className?: string;
  emptyMessage?: ReactNode | string;
  isLoading?: boolean | undefined;
  loadingMessage?: ReactNode | string;
  loadingMode?: 'skeleton' | 'spinner';
  onRowClick?: (row: TData) => void;
  recordCount: number;
  table: ReactTable<TFeatures, TData>;
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

function DataGridProvider<
  TData extends RowData,
  TFeatures extends DataGridFeatures<TData> = DataGridFeatures<TData>,
>({ children, table, ...props }: DataGridProps<TData, TFeatures>) {
  return (
    <DataGridContext
      value={{
        isLoading: props.isLoading ?? false,
        props,
        recordCount: props.recordCount,
        // Two independent reasons this cast is required: ReactTable is
        // invariant in TData, and inside the generic an unresolved TFeatures
        // erases the table's feature APIs. Removing either half of the
        // reasoning is not enough to drop it — re-test before touching.
        table: table as unknown as ReactTable<DataGridFeatures<any>, any>,
      }}
    >
      {children}
    </DataGridContext>
  );
}

function DataGrid<
  TData extends RowData,
  TFeatures extends DataGridFeatures<TData> = DataGridFeatures<TData>,
>({ children, table, ...props }: DataGridProps<TData, TFeatures>) {
  const defaultProps: Partial<DataGridProps<TData, TFeatures>> = {
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

  const mergedProps: Omit<DataGridProps<TData, TFeatures>, 'table'> = {
    ...defaultProps,
    ...props,
    tableClassNames: {
      ...defaultProps.tableClassNames,
      ...props.tableClassNames,
    },
    tableLayout: { ...defaultProps.tableLayout, ...props.tableLayout },
  };

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
  column: Column<DataGridFeatures<TData>, TData, TValue>,
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
