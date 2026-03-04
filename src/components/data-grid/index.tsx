'use client';

import {
  type Column,
  type ColumnFiltersState,
  type RowData,
  type SortingState,
  type Table,
} from '@tanstack/react-table';
import { createContext, type ReactNode, use } from 'react';

import { cn } from '@/lib/utils';

declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/consistent-type-definitions
  interface ColumnMeta<TData extends RowData, TValue> {
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
  pagination: {
    page: number;
    total: number;
  };
};

export type DataGridContextProps<TData extends object> = {
  isLoading: boolean;
  props: DataGridProps<TData>;
  recordCount: number;
  table: Table<TData>;
};

export type DataGridRequestParams = {
  columnFilters?: ColumnFiltersState;
  pageIndex: number;
  pageSize: number;
  sorting?: SortingState;
};

export type DataGridProps<TData extends object> = {
  children?: ReactNode;
  className?: string;
  emptyMessage?: ReactNode | string;
  isLoading?: boolean | undefined;
  loadingMessage?: ReactNode | string;
  loadingMode?: 'skeleton' | 'spinner';
  onRowClick?: (row: TData) => void;
  recordCount: number;
  table?: Table<TData>;
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

function DataGridProvider<TData extends object>({
  children,
  table,
  ...props
}: DataGridProps<TData> & { table: Table<TData> }) {
  return (
    <DataGridContext.Provider
      value={{
        isLoading: props.isLoading ?? false,
        props,
        recordCount: props.recordCount,
        table,
      }}
    >
      {children}
    </DataGridContext.Provider>
  );
}

function DataGrid<TData extends object>({
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
    tableLayout: {
      ...defaultProps.tableLayout,
      ...props.tableLayout,
    },
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
        border && 'border-border rounded-xl border',
        className,
      )}
      data-slot="data-grid"
    >
      {children}
    </div>
  );
}

function getColumnMeta<TData, TValue>(column: Column<TData, TValue>) {
  return column.columnDef.meta as DataGridColumnMeta<TData> | undefined;
}

export {
  DataGrid,
  DataGridContainer,
  DataGridProvider,
  getColumnMeta,
  useDataGrid,
};
