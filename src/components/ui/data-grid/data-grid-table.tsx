import {
  type Cell,
  type Column,
  flexRender,
  type Header,
  type HeaderGroup,
  type Row,
} from '@tanstack/react-table';
import { cva } from 'class-variance-authority';
import { type CSSProperties, Fragment, type ReactNode, useMemo } from 'react';

import { Checkbox } from '@/components/ui/checkbox';
import { useDataGrid } from '@/components/ui/data-grid/data-grid';
import { cn } from '@/lib/utils';

const headerCellSpacingVariants = cva('', {
  variants: {
    size: {
      dense: 'px-2.5 h-9',
      default: 'px-4',
    },
  },
  defaultVariants: {
    size: 'default',
  },
});

const bodyCellSpacingVariants = cva('', {
  variants: {
    size: {
      dense: 'px-2.5 py-2',
      default: 'px-4 py-2.5',
    },
  },
  defaultVariants: {
    size: 'default',
  },
});

function getPinningStyles<TData>(column: Column<TData>): CSSProperties {
  const isPinned = column.getIsPinned();

  return {
    left: isPinned === 'left' ? `${column.getStart('left')}px` : undefined,
    position: isPinned ? 'sticky' : 'relative',
    right: isPinned === 'right' ? `${column.getAfter('right')}px` : undefined,
    width: column.getSize(),
    zIndex: isPinned ? 1 : 0,
  };
}

function DataGridTableBase({ children }: { children: ReactNode }) {
  const { props, table } = useDataGrid();

  return (
    <table
      className={cn(
        'text-foreground text-sm w-full min-w-full caption-bottom text-left align-middle font-normal rtl:text-right',
        props.tableLayout?.width === 'auto' ? 'table-auto' : 'table-fixed',
        !props.tableLayout?.columnsResizable && '',
        !props.tableLayout?.columnsDraggable &&
          'border-separate border-spacing-0',
        props.tableClassNames?.base,
      )}
      data-slot="data-grid-table"
      style={
        props.tableLayout?.columnsResizable
          ? { width: table.getTotalSize() }
          : undefined
      }
    >
      {children}
    </table>
  );
}

function DataGridTableHead({ children }: { children: ReactNode }) {
  const { props } = useDataGrid();

  return (
    <thead
      className={cn(
        props.tableClassNames?.header,
        props.tableLayout?.headerSticky && props.tableClassNames?.headerSticky,
      )}
    >
      {children}
    </thead>
  );
}

function DataGridTableHeadRow<TData>({
  children,
  headerGroup,
}: {
  children: ReactNode;
  headerGroup: HeaderGroup<TData>;
}) {
  const { props } = useDataGrid();

  return (
    <tr
      key={headerGroup.id}
      className={cn(
        'bg-muted/40',
        props.tableLayout?.headerBorder && '[&>th]:border-b',
        props.tableLayout?.cellBorder && '*:last:border-e-0',
        props.tableLayout?.stripped && 'bg-transparent',
        props.tableLayout?.headerBackground === false && 'bg-transparent',
        props.tableClassNames?.headerRow,
      )}
    >
      {children}
    </tr>
  );
}

function DataGridTableHeadRowCell<TData>({
  children,
  header,
  dndRef,
  dndStyle,
}: {
  children: ReactNode;
  header: Header<TData, unknown>;
  dndRef?: React.Ref<HTMLTableCellElement>;
  dndStyle?: CSSProperties;
}) {
  const { props } = useDataGrid();

  const { column } = header;
  const isPinned = column.getIsPinned();
  const isLastLeftPinned =
    isPinned === 'left' && column.getIsLastColumn('left');
  const isFirstRightPinned =
    isPinned === 'right' && column.getIsFirstColumn('right');
  const headerCellSpacing = headerCellSpacingVariants({
    size: props.tableLayout?.dense ? 'dense' : 'default',
  });

  return (
    <th
      key={header.id}
      ref={dndRef}
      className={cn(
        'text-secondary-foreground/80 h-10 relative text-left align-middle font-normal rtl:text-right [&:has([role=checkbox])]:pe-0',
        headerCellSpacing,
        props.tableLayout?.cellBorder && 'border-e',
        props.tableLayout?.columnsResizable &&
          column.getCanResize() &&
          'truncate',
        props.tableLayout?.columnsPinnable &&
          column.getCanPin() &&
          '[&[data-pinned][data-last-col]]:border-border data-pinned:bg-muted/90 data-pinned:backdrop-blur-xs [&:not([data-pinned]):has(+[data-pinned])_div.cursor-col-resize:last-child]:opacity-0 [&[data-last-col=left]_div.cursor-col-resize:last-child]:opacity-0 [&[data-pinned=left][data-last-col=left]]:border-e! [&[data-pinned=right]:last-child_div.cursor-col-resize:last-child]:opacity-0 [&[data-pinned=right][data-last-col=right]]:border-s!',
        header.column.columnDef.meta?.headerClassName,
        column.getIndex() === 0 ||
          column.getIndex() === header.headerGroup.headers.length - 1
          ? props.tableClassNames?.edgeCell
          : '',
      )}
      data-last-col={
        isLastLeftPinned ? 'left' : isFirstRightPinned ? 'right' : undefined
      }
      data-pinned={isPinned === false ? undefined : isPinned}
      style={{
        ...((props.tableLayout?.width === 'fixed' ||
          props.tableLayout?.columnsResizable) && {
          width: header.getSize(),
        }),
        ...(props.tableLayout?.columnsPinnable &&
          column.getCanPin() &&
          getPinningStyles(column)),
        ...(dndStyle ?? null),
      }}
    >
      {children}
    </th>
  );
}

function DataGridTableHeadRowCellResize<TData>({
  header,
}: {
  header: Header<TData, unknown>;
}) {
  const { column } = header;

  return (
    <div
      {...{
        className:
          'absolute top-0 h-full w-4 cursor-col-resize user-select-none touch-none -end-2 z-10 flex justify-center before:absolute before:w-px before:inset-y-0 before:bg-border before:-translate-x-px',
        onDoubleClick: () => column.resetSize(),
        onMouseDown: header.getResizeHandler(),
        onTouchStart: header.getResizeHandler(),
      }}
    />
  );
}

function DataGridTableRowSpacer() {
  return <tbody aria-hidden="true" className="h-2"></tbody>;
}

function DataGridTableBody({ children }: { children: ReactNode }) {
  const { props } = useDataGrid();

  return (
    <tbody
      className={cn(
        '[&_tr:last-child]:border-0',
        props.tableLayout?.rowRounded && '[&_td:first-child]:rounded-l-none',
        props.tableLayout?.rowRounded && '[&_td:last-child]:rounded-r-none',
        props.tableClassNames?.body,
      )}
    >
      {children}
    </tbody>
  );
}

function DataGridTableBodyRowSkeleton({ children }: { children: ReactNode }) {
  const { table, props } = useDataGrid();

  return (
    <tr
      className={cn(
        'hover:bg-muted/40 data-[state=selected]:bg-muted/50',
        props.onRowClick && 'cursor-pointer',
        !props.tableLayout?.stripped &&
          props.tableLayout?.rowBorder &&
          'border-border border-b [&:not(:last-child)>td]:border-b',
        props.tableLayout?.cellBorder && '*:last:border-e-0',
        props.tableLayout?.stripped &&
          'odd:bg-muted/90 odd:hover:bg-muted hover:bg-transparent',
        table.options.enableRowSelection && '*:first:relative',
        props.tableClassNames?.bodyRow,
      )}
    >
      {children}
    </tr>
  );
}

function DataGridTableBodyRowSkeletonCell<TData>({
  children,
  column,
}: {
  children: ReactNode;
  column: Column<TData>;
}) {
  const { props, table } = useDataGrid();
  const bodyCellSpacing = bodyCellSpacingVariants({
    size: props.tableLayout?.dense ? 'dense' : 'default',
  });

  return (
    <td
      className={cn(
        'align-middle',
        bodyCellSpacing,
        props.tableLayout?.cellBorder && 'border-e',
        props.tableLayout?.columnsResizable &&
          column.getCanResize() &&
          'truncate',
        column.columnDef.meta?.cellClassName,
        props.tableLayout?.columnsPinnable &&
          column.getCanPin() &&
          '[&[data-pinned][data-last-col]]:border-border data-pinned:bg-background/90 data-pinned:backdrop-blur-xs" [&[data-pinned=left][data-last-col=left]]:border-e! [&[data-pinned=right][data-last-col=right]]:border-s!',
        column.getIndex() === 0 ||
          column.getIndex() === table.getVisibleFlatColumns().length - 1
          ? props.tableClassNames?.edgeCell
          : '',
      )}
      style={
        props.tableLayout?.columnsResizable
          ? { width: column.getSize() }
          : undefined
      }
    >
      {children}
    </td>
  );
}

function DataGridTableBodyRow<TData>({
  children,
  row,
  dndRef,
  dndStyle,
}: {
  children: ReactNode;
  row: Row<TData>;
  dndRef?: React.Ref<HTMLTableRowElement>;
  dndStyle?: CSSProperties;
}) {
  const { props, table } = useDataGrid();

  return (
    <tr
      ref={dndRef}
      className={cn(
        'hover:bg-muted/40 data-[state=selected]:bg-muted/50',
        props.onRowClick && 'cursor-pointer',
        !props.tableLayout?.stripped &&
          props.tableLayout?.rowBorder &&
          'border-border border-b [&:not(:last-child)>td]:border-b',
        props.tableLayout?.cellBorder && '*:last:border-e-0',
        props.tableLayout?.stripped &&
          'odd:bg-muted/90 odd:hover:bg-muted hover:bg-transparent',
        table.options.enableRowSelection && '*:first:relative',
        props.tableClassNames?.bodyRow,
      )}
      data-state={
        table.options.enableRowSelection && row.getIsSelected()
          ? 'selected'
          : undefined
      }
      style={{ ...(dndStyle ?? null) }}
      onClick={() => props.onRowClick?.(row.original)}
    >
      {children}
    </tr>
  );
}

function DataGridTableBodyRowExpandded<TData>({ row }: { row: Row<TData> }) {
  const { props, table } = useDataGrid();

  return (
    <tr
      className={cn(
        props.tableLayout?.rowBorder && '[&:not(:last-child)>td]:border-b',
      )}
    >
      <td colSpan={row.getVisibleCells().length}>
        {table
          .getAllColumns()
          .find((column) => column.columnDef.meta?.expandedContent)
          ?.columnDef.meta?.expandedContent?.(row.original)}
      </td>
    </tr>
  );
}

function DataGridTableBodyRowCell<TData>({
  children,
  cell,
  dndRef,
  dndStyle,
}: {
  children: ReactNode;
  cell: Cell<TData, unknown>;
  dndRef?: React.Ref<HTMLTableCellElement>;
  dndStyle?: CSSProperties;
}) {
  const { props } = useDataGrid();

  const { column, row } = cell;
  const isPinned = column.getIsPinned();
  const isLastLeftPinned =
    isPinned === 'left' && column.getIsLastColumn('left');
  const isFirstRightPinned =
    isPinned === 'right' && column.getIsFirstColumn('right');
  const bodyCellSpacing = bodyCellSpacingVariants({
    size: props.tableLayout?.dense ? 'dense' : 'default',
  });

  return (
    <td
      key={cell.id}
      ref={dndRef}
      {...(props.tableLayout?.columnsDraggable && !isPinned ? { cell } : {})}
      className={cn(
        'align-middle',
        bodyCellSpacing,
        props.tableLayout?.cellBorder && 'border-e',
        props.tableLayout?.columnsResizable &&
          column.getCanResize() &&
          'truncate',
        cell.column.columnDef.meta?.cellClassName,
        props.tableLayout?.columnsPinnable &&
          column.getCanPin() &&
          '[&[data-pinned][data-last-col]]:border-border data-pinned:bg-background/90 data-pinned:backdrop-blur-xs" [&[data-pinned=left][data-last-col=left]]:border-e! [&[data-pinned=right][data-last-col=right]]:border-s!',
        column.getIndex() === 0 ||
          column.getIndex() === row.getVisibleCells().length - 1
          ? props.tableClassNames?.edgeCell
          : '',
      )}
      data-last-col={
        isLastLeftPinned ? 'left' : isFirstRightPinned ? 'right' : undefined
      }
      data-pinned={isPinned === false ? undefined : isPinned}
      style={{
        ...(props.tableLayout?.columnsResizable && {
          width: column.getSize(),
        }),
        ...(props.tableLayout?.columnsPinnable &&
          column.getCanPin() &&
          getPinningStyles(column)),
        ...(dndStyle ?? null),
      }}
    >
      {children}
    </td>
  );
}

function DataGridTableEmpty() {
  const { table, props } = useDataGrid();
  const totalColumns = table.getAllColumns().length;

  return (
    <tr>
      <td
        className="text-muted-foreground text-sm py-6 text-center"
        colSpan={totalColumns}
      >
        {props.emptyMessage ?? 'No data available'}
      </td>
    </tr>
  );
}

function DataGridTableLoader() {
  const { props } = useDataGrid();

  return (
    <div className="absolute top-1/2 left-1/2 -translate-1/2">
      <div className="text-muted-foreground bg-card rounded-2xl text-sm flex items-center gap-2 border px-4 py-2 leading-none font-medium">
        <svg
          className="text-muted-foreground -ml-1 size-5 animate-spin"
          fill="none"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <title>Loading</title>
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="3"
          ></circle>
          <path
            className="opacity-75"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            fill="currentColor"
          ></path>
        </svg>
        {props.loadingMessage ?? 'Loading...'}
      </div>
    </div>
  );
}

function DataGridTableRowSelect<TData>({ row }: { row: Row<TData> }) {
  return (
    <>
      <div
        className={cn(
          'bg-primary absolute start-0 inset-y-0 hidden w-0.5',
          row.getIsSelected() && 'block',
        )}
      ></div>
      <Checkbox
        aria-label="Select row"
        checked={row.getIsSelected()}
        className="align-[inherit]"
        onCheckedChange={(value) => row.toggleSelected(!!value)}
      />
    </>
  );
}

function DataGridTableRowSelectAll() {
  const { table, recordCount, isLoading } = useDataGrid();

  const isAllSelected = table.getIsAllPageRowsSelected();
  const isSomeSelected = table.getIsSomePageRowsSelected();

  return (
    <Checkbox
      aria-label="Select all"
      checked={isAllSelected}
      className="align-[inherit]"
      disabled={[isLoading, recordCount === 0].some(Boolean)}
      indeterminate={isSomeSelected && !isAllSelected}
      onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
    />
  );
}

function DataGridTable<TData>() {
  const { table, isLoading, props } = useDataGrid();
  const pagination = table.getState().pagination;
  const skeletonRows = useMemo(() => {
    const count = pagination?.pageSize ?? 0;
    const pageKey = pagination?.pageIndex ?? 0;
    return Array.from({ length: count }, (_, index) => ({
      id: `skeleton-${pageKey}-${index}`,
    }));
  }, [pagination?.pageSize, pagination?.pageIndex]);

  return (
    <DataGridTableBase>
      <DataGridTableHead>
        {table.getHeaderGroups().map((headerGroup: HeaderGroup<TData>) => {
          return (
            <DataGridTableHeadRow
              key={headerGroup.id}
              headerGroup={headerGroup}
            >
              {headerGroup.headers.map((header) => {
                const { column } = header;

                return (
                  <DataGridTableHeadRowCell key={header.id} header={header}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                    {props.tableLayout?.columnsResizable &&
                      column.getCanResize() && (
                        <DataGridTableHeadRowCellResize header={header} />
                      )}
                  </DataGridTableHeadRowCell>
                );
              })}
            </DataGridTableHeadRow>
          );
        })}
      </DataGridTableHead>

      {[
        props.tableLayout?.stripped,
        !(props.tableLayout?.rowBorder ?? true),
      ].some(Boolean) && <DataGridTableRowSpacer />}

      <DataGridTableBody>
        {isLoading &&
        props.loadingMode === 'skeleton' &&
        pagination?.pageSize ? (
          // Show skeleton loading immediately
          skeletonRows.map((row) => (
            <DataGridTableBodyRowSkeleton key={row.id}>
              {table.getVisibleFlatColumns().map((column) => {
                return (
                  <DataGridTableBodyRowSkeletonCell
                    key={column.id}
                    column={column}
                  >
                    {column.columnDef.meta?.skeleton}
                  </DataGridTableBodyRowSkeletonCell>
                );
              })}
            </DataGridTableBodyRowSkeleton>
          ))
        ) : isLoading && props.loadingMode === 'spinner' ? (
          // Show spinner loading immediately
          <tr>
            <td className="p-8" colSpan={table.getVisibleFlatColumns().length}>
              <div className="flex items-center justify-center">
                <svg
                  className="text-muted-foreground mr-3 -ml-1 size-5 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <title>Loading</title>
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    fill="currentColor"
                  ></path>
                </svg>
                {props.loadingMessage ?? 'Loading...'}
              </div>
            </td>
          </tr>
        ) : table.getRowModel().rows.length > 0 ? (
          // Show actual data when not loading
          table.getRowModel().rows.map((row: Row<TData>) => {
            return (
              <Fragment key={row.id}>
                <DataGridTableBodyRow key={row.id} row={row}>
                  {row.getVisibleCells().map((cell: Cell<TData, unknown>) => {
                    return (
                      <DataGridTableBodyRowCell key={cell.id} cell={cell}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </DataGridTableBodyRowCell>
                    );
                  })}
                </DataGridTableBodyRow>
                {row.getIsExpanded() && (
                  <DataGridTableBodyRowExpandded row={row} />
                )}
              </Fragment>
            );
          })
        ) : (
          <DataGridTableEmpty />
        )}
      </DataGridTableBody>
    </DataGridTableBase>
  );
}

export {
  DataGridTable,
  DataGridTableBase,
  DataGridTableBody,
  DataGridTableBodyRow,
  DataGridTableBodyRowCell,
  DataGridTableBodyRowExpandded,
  DataGridTableBodyRowSkeleton,
  DataGridTableBodyRowSkeletonCell,
  DataGridTableEmpty,
  DataGridTableHead,
  DataGridTableHeadRow,
  DataGridTableHeadRowCell,
  DataGridTableHeadRowCellResize,
  DataGridTableLoader,
  DataGridTableRowSelect,
  DataGridTableRowSelectAll,
  DataGridTableRowSpacer,
};
