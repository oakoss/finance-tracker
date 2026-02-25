'use client';

import {
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
  headerTitle?: string;
  headerClassName?: string;
  cellClassName?: string;
  skeleton?: ReactNode;
  expandedContent?: (row: TData) => ReactNode;
};

export type DataGridApiFetchParams = {
  pageIndex: number;
  pageSize: number;
  sorting?: SortingState;
  filters?: ColumnFiltersState;
  searchQuery?: string;
};

export type DataGridApiResponse<T> = {
  data: T[];
  empty: boolean;
  pagination: {
    total: number;
    page: number;
  };
};

export type DataGridContextProps<TData extends object> = {
  props: DataGridProps<TData>;
  table: Table<TData>;
  recordCount: number;
  isLoading: boolean;
};

export type DataGridRequestParams = {
  pageIndex: number;
  pageSize: number;
  sorting?: SortingState;
  columnFilters?: ColumnFiltersState;
};

export type DataGridProps<TData extends object> = {
  className?: string;
  table?: Table<TData>;
  recordCount: number;
  children?: ReactNode;
  onRowClick?: (row: TData) => void;
  isLoading?: boolean;
  loadingMode?: 'skeleton' | 'spinner';
  loadingMessage?: ReactNode | string;
  emptyMessage?: ReactNode | string;
  tableLayout?: {
    dense?: boolean;
    cellBorder?: boolean;
    rowBorder?: boolean;
    rowRounded?: boolean;
    stripped?: boolean;
    headerBackground?: boolean;
    headerBorder?: boolean;
    headerSticky?: boolean;
    width?: 'auto' | 'fixed';
    columnsVisibility?: boolean;
    columnsResizable?: boolean;
    columnsPinnable?: boolean;
    columnsMovable?: boolean;
    columnsDraggable?: boolean;
    rowsDraggable?: boolean;
  };
  tableClassNames?: {
    base?: string;
    header?: string;
    headerRow?: string;
    headerSticky?: string;
    body?: string;
    bodyRow?: string;
    footer?: string;
    edgeCell?: string;
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
      columnsPinnable: false,
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
  children,
  className,
  border = true,
}: {
  children: ReactNode;
  className?: string;
  border?: boolean;
}) {
  return (
    <div
      className={cn(
        'w-full overflow-hidden',
        border && 'border-border rounded-2xl border',
        className,
      )}
      data-slot="data-grid"
    >
      {children}
    </div>
  );
}

export { DataGrid, DataGridContainer, DataGridProvider, useDataGrid };
