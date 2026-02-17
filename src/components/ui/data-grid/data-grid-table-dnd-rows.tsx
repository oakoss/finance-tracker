import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  type Modifier,
  MouseSensor,
  TouchSensor,
  type UniqueIdentifier,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  type Cell,
  flexRender,
  type HeaderGroup,
  type Row,
} from '@tanstack/react-table';
import {
  createContext,
  type CSSProperties,
  use,
  useId,
  useMemo,
  useRef,
} from 'react';

import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { useDataGrid } from '@/components/ui/data-grid/data-grid';
import {
  DataGridTableBase,
  DataGridTableBody,
  DataGridTableBodyRow,
  DataGridTableBodyRowCell,
  DataGridTableBodyRowSkeleton,
  DataGridTableBodyRowSkeletonCell,
  DataGridTableEmpty,
  DataGridTableHead,
  DataGridTableHeadRow,
  DataGridTableHeadRowCell,
  DataGridTableHeadRowCellResize,
  DataGridTableRowSpacer,
} from '@/components/ui/data-grid/data-grid-table';
import { cn } from '@/lib/utils';

// Context to share sortable listeners from row to handle
type SortableContextValue = ReturnType<typeof useSortable>;
const SortableRowContext = createContext<Pick<
  SortableContextValue,
  'attributes' | 'listeners'
> | null>(null);

function DataGridTableDndRowHandle({ className }: { className?: string }) {
  const context = use(SortableRowContext);

  if (!context) {
    // Fallback if context is not available (shouldn't happen in normal usage)
    return (
      <Button
        disabled
        className={cn(
          'size-7 cursor-move opacity-70 hover:bg-transparent hover:opacity-100',
          className,
        )}
        size="icon-sm"
        variant="ghost"
      >
        <Icons.GripHorizontal />
      </Button>
    );
  }

  return (
    <Button
      className={cn(
        'size-7 cursor-move opacity-70 hover:bg-transparent hover:opacity-100',
        className,
      )}
      size="icon-sm"
      variant="ghost"
      {...context.attributes}
      {...context.listeners}
    >
      <Icons.GripHorizontal />
    </Button>
  );
}

function DataGridTableDndRow<TData>({ row }: { row: Row<TData> }) {
  const {
    transform,
    transition,
    setNodeRef,
    isDragging,
    attributes,
    listeners,
  } = useSortable({
    id: row.id,
  });

  const style: CSSProperties = {
    opacity: isDragging ? 0.8 : 1,
    position: 'relative',
    transform: CSS.Transform.toString(transform),
    transition: transition,
    zIndex: isDragging ? 1 : 0,
  };

  return (
    <SortableRowContext.Provider value={{ attributes, listeners }}>
      <DataGridTableBodyRow
        key={row.id}
        dndRef={setNodeRef}
        dndStyle={style}
        row={row}
      >
        {row.getVisibleCells().map((cell: Cell<TData, unknown>) => {
          return (
            <DataGridTableBodyRowCell key={cell.id} cell={cell}>
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </DataGridTableBodyRowCell>
          );
        })}
      </DataGridTableBodyRow>
    </SortableRowContext.Provider>
  );
}

function DataGridTableDndRows<TData>({
  handleDragEnd,
  dataIds,
}: {
  handleDragEnd: (event: DragEndEvent) => void;
  dataIds: UniqueIdentifier[];
}) {
  const { table, isLoading, props } = useDataGrid();
  const pagination = table.getState().pagination;
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const skeletonRows = useMemo(() => {
    const count = pagination?.pageSize ?? 0;
    const pageKey = pagination?.pageIndex ?? 0;
    return Array.from({ length: count }, (_, index) => ({
      id: `skeleton-${pageKey}-${index}`,
    }));
  }, [pagination?.pageSize, pagination?.pageIndex]);

  const sensors = useSensors(
    useSensor(MouseSensor, {}),
    useSensor(TouchSensor, {}),
    useSensor(KeyboardSensor, {}),
  );

  const modifiers = useMemo(() => {
    const restrictToTableContainer: Modifier = ({
      transform,
      draggingNodeRect,
    }) => {
      if (!tableContainerRef.current || !draggingNodeRect) {
        return transform;
      }

      const containerRect = tableContainerRef.current.getBoundingClientRect();
      const { x, y } = transform;

      const minX = containerRect.left - draggingNodeRect.left;
      const maxX = containerRect.right - draggingNodeRect.right;
      const minY = containerRect.top - draggingNodeRect.top;
      const maxY = containerRect.bottom - draggingNodeRect.bottom;

      return {
        ...transform,
        x: Math.max(minX, Math.min(maxX, x)),
        y: Math.max(minY, Math.min(maxY, y)),
      };
    };

    return [restrictToVerticalAxis, restrictToTableContainer];
  }, []);

  return (
    <DndContext
      collisionDetection={closestCenter}
      id={useId()}
      modifiers={modifiers}
      sensors={sensors}
      onDragEnd={handleDragEnd}
    >
      <div ref={tableContainerRef} className="relative">
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
            {props.loadingMode === 'skeleton' &&
            isLoading &&
            pagination?.pageSize ? (
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
            ) : table.getRowModel().rows.length > 0 ? (
              <SortableContext
                items={dataIds}
                strategy={verticalListSortingStrategy}
              >
                {table.getRowModel().rows.map((row: Row<TData>) => {
                  return <DataGridTableDndRow key={row.id} row={row} />;
                })}
              </SortableContext>
            ) : (
              <DataGridTableEmpty />
            )}
          </DataGridTableBody>
        </DataGridTableBase>
      </div>
    </DndContext>
  );
}

export { DataGridTableDndRowHandle, DataGridTableDndRows };
