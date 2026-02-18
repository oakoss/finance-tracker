'use client';

import { type Column } from '@tanstack/react-table';
import { type HTMLAttributes, memo, type ReactNode, useMemo } from 'react';

import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import {
  type DataGridColumnMeta,
  useDataGrid,
} from '@/components/ui/data-grid/data-grid';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

function renderIcon(icon: React.ReactNode) {
  if (!icon) {
    return null;
  }

  return <span className="inline-flex">{icon}</span>;
}

function getColumnMeta<TData, TValue>(column: Column<TData, TValue>) {
  return column.columnDef.meta as DataGridColumnMeta<TData> | undefined;
}

type DataGridColumnHeaderProps<TData, TValue> = {
  column: Column<TData, TValue>;
  title?: string;
  icon?: ReactNode;
  pinnable?: boolean;
  filter?: ReactNode;
  visibility?: boolean;
} & HTMLAttributes<HTMLDivElement>;

function DataGridColumnHeaderInner<TData, TValue>({
  column,
  title = '',
  icon,
  className,
  filter,
  visibility = false,
}: DataGridColumnHeaderProps<TData, TValue>) {
  const { isLoading, table, props, recordCount } = useDataGrid();

  const columnOrder = table.getState().columnOrder;
  const columnVisibility = table.getState().columnVisibility;
  const isSorted = column.getIsSorted();
  const isPinned = column.getIsPinned();
  const canSort = column.getCanSort();
  const canPin = column.getCanPin();
  const canResize = column.getCanResize();

  const columnIndex = columnOrder.indexOf(column.id);
  const canMoveLeft = columnIndex > 0;
  const canMoveRight = columnIndex < columnOrder.length - 1;

  function handleSort() {
    if (isSorted === 'asc') {
      column.toggleSorting(true);
    } else if (isSorted === 'desc') {
      column.clearSorting();
    } else {
      column.toggleSorting(false);
    }
  }

  const headerLabelClassName = cn(
    'text-secondary-foreground/80 inline-flex h-full items-center gap-1.5 font-normal [&_svg]:opacity-60 text-[0.8125rem] leading-[calc(1.125/0.8125)] [&_svg]:size-3.5',
    className,
  );

  const headerButtonClassName = cn(
    'text-secondary-foreground/80 hover:bg-secondary data-[state=open]:bg-secondary hover:text-foreground data-[state=open]:text-foreground -ms-2 px-2 font-normal h-7 rounded-md',
    className,
  );

  const sortIcon = canSort ? (
    isSorted === 'desc' ? (
      <Icons.ArrowDown className="size-3.25" />
    ) : isSorted === 'asc' ? (
      <Icons.ArrowUp className="size-3.25" />
    ) : (
      <Icons.ChevronsUpDown className="mt-px size-3.25" />
    )
  ) : null;

  const iconNode = renderIcon(icon);

  const hasControls = [
    props.tableLayout?.columnsMovable,
    props.tableLayout?.columnsVisibility && visibility,
    props.tableLayout?.columnsPinnable && canPin,
    filter,
  ].some(Boolean);

  const isTableDisabled = [isLoading, recordCount === 0].some(Boolean);

  const menuItems = useMemo(() => {
    const items: ReactNode[] = [];
    let hasPreviousSection = false;

    // Filter section
    if (filter) {
      items.push(
        <DropdownMenuGroup key="group-filter">
          <DropdownMenuLabel key="filter">{filter}</DropdownMenuLabel>
        </DropdownMenuGroup>,
      );
      hasPreviousSection = true;
    }

    // Sort section
    if (canSort) {
      if (hasPreviousSection) {
        items.push(<DropdownMenuSeparator key="sep-sort" />);
      }
      items.push(
        <DropdownMenuItem
          key="sort-asc"
          disabled={!canSort}
          onClick={() => {
            if (isSorted === 'asc') {
              column.clearSorting();
            } else {
              column.toggleSorting(false);
            }
          }}
        >
          <Icons.ArrowUp className="size-3.5!" />
          <span className="grow">Asc</span>
          {isSorted === 'asc' && (
            <Icons.Check className="text-primary size-4 opacity-100!" />
          )}
        </DropdownMenuItem>,
        <DropdownMenuItem
          key="sort-desc"
          disabled={!canSort}
          onClick={() => {
            if (isSorted === 'desc') {
              column.clearSorting();
            } else {
              column.toggleSorting(true);
            }
          }}
        >
          <Icons.ArrowDown className="size-3.5!" />
          <span className="grow">Desc</span>
          {isSorted === 'desc' && (
            <Icons.Check className="text-primary size-4 opacity-100!" />
          )}
        </DropdownMenuItem>,
      );
      hasPreviousSection = true;
    }

    // Pin section
    if (props.tableLayout?.columnsPinnable && canPin) {
      if (hasPreviousSection) {
        items.push(<DropdownMenuSeparator key="sep-pin" />);
      }
      items.push(
        <DropdownMenuItem
          key="pin-left"
          onClick={() => column.pin(isPinned === 'left' ? false : 'left')}
        >
          <Icons.ArrowLeftToLine aria-hidden="true" className="size-3.5!" />
          <span className="grow">Pin to left</span>
          {isPinned === 'left' && (
            <Icons.Check className="text-primary size-4 opacity-100!" />
          )}
        </DropdownMenuItem>,
        <DropdownMenuItem
          key="pin-right"
          onClick={() => column.pin(isPinned === 'right' ? false : 'right')}
        >
          <Icons.ArrowRightToLine aria-hidden="true" className="size-3.5!" />
          <span className="grow">Pin to right</span>
          {isPinned === 'right' && (
            <Icons.Check className="text-primary size-4 opacity-100!" />
          )}
        </DropdownMenuItem>,
      );
      hasPreviousSection = true;
    }

    // Move section
    if (props.tableLayout?.columnsMovable) {
      if (hasPreviousSection) {
        items.push(<DropdownMenuSeparator key="sep-move" />);
      }
      items.push(
        <DropdownMenuItem
          key="move-left"
          disabled={!canMoveLeft || isPinned !== false}
          onClick={() => {
            if (columnIndex > 0) {
              const newOrder = [...columnOrder];
              const [movedColumn] = newOrder.splice(columnIndex, 1);
              newOrder.splice(columnIndex - 1, 0, movedColumn);
              table.setColumnOrder(newOrder);
            }
          }}
        >
          <Icons.ArrowLeft aria-hidden="true" className="size-3.5!" />
          <span>Move to Left</span>
        </DropdownMenuItem>,
        <DropdownMenuItem
          key="move-right"
          disabled={!canMoveRight || isPinned !== false}
          onClick={() => {
            if (columnIndex < columnOrder.length - 1) {
              const newOrder = [...columnOrder];
              const [movedColumn] = newOrder.splice(columnIndex, 1);
              newOrder.splice(columnIndex + 1, 0, movedColumn);
              table.setColumnOrder(newOrder);
            }
          }}
        >
          <Icons.ArrowRight aria-hidden="true" className="size-3.5!" />
          <span>Move to Right</span>
        </DropdownMenuItem>,
      );
      hasPreviousSection = true;
    }

    // Visibility section
    if (props.tableLayout?.columnsVisibility && visibility) {
      if (hasPreviousSection) {
        items.push(<DropdownMenuSeparator key="sep-visibility" />);
      }
      items.push(
        <DropdownMenuSub key="visibility">
          <DropdownMenuSubTrigger>
            <Icons.Settings2 className="size-3.5!" />
            <span>Columns</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent side="right">
            {table
              .getAllColumns()
              .filter((col) => col.accessorFn !== undefined && col.getCanHide())
              .map((col) => {
                const meta = getColumnMeta(col);

                return (
                  <DropdownMenuCheckboxItem
                    key={col.id}
                    checked={columnVisibility[col.id] ?? true}
                    className="capitalize"
                    onCheckedChange={(value) => col.toggleVisibility(!!value)}
                    onSelect={(event) => event.preventDefault()}
                  >
                    {meta?.headerTitle ?? col.id}
                  </DropdownMenuCheckboxItem>
                );
              })}
          </DropdownMenuSubContent>
        </DropdownMenuSub>,
      );
    }

    return items;
  }, [
    filter,
    canSort,
    isSorted,
    column,
    props.tableLayout?.columnsPinnable,
    props.tableLayout?.columnsMovable,
    props.tableLayout?.columnsVisibility,
    canPin,
    isPinned,
    canMoveLeft,
    canMoveRight,
    visibility,
    table,
    columnIndex,
    columnOrder,
    columnVisibility, // Needed to update checkbox states when visibility changes
  ]);

  if (hasControls) {
    const showUnpinButton =
      props.tableLayout?.columnsPinnable && canPin && isPinned !== false;

    return (
      <div className="flex h-full items-center justify-between gap-1.5">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                className={headerButtonClassName}
                disabled={isTableDisabled}
                variant="ghost"
              >
                {iconNode}
                {title}
                {sortIcon}
              </Button>
            }
          />
          <DropdownMenuContent align="start" className="w-40">
            {menuItems}
          </DropdownMenuContent>
        </DropdownMenu>
        {showUnpinButton ? (
          <Button
            aria-label={`Unpin ${title} column`}
            className="-me-1 size-7 rounded-md"
            size="icon-sm"
            title={`Unpin ${title} column`}
            variant="ghost"
            onClick={() => column.pin(false)}
          >
            <Icons.PinOff
              aria-hidden="true"
              className="size-3.5! opacity-50!"
            />
          </Button>
        ) : null}
      </div>
    );
  }

  if (canSort || (props.tableLayout?.columnsResizable && canResize)) {
    return (
      <div className="flex h-full items-center">
        <Button
          className={headerButtonClassName}
          disabled={isTableDisabled}
          variant="ghost"
          onClick={handleSort}
        >
          {iconNode}
          {title}
          {sortIcon}
        </Button>
      </div>
    );
  }

  return (
    <div className={headerLabelClassName}>
      {iconNode}
      {title}
    </div>
  );
}

const DataGridColumnHeader = memo(
  DataGridColumnHeaderInner,
) as typeof DataGridColumnHeaderInner;

export { DataGridColumnHeader, type DataGridColumnHeaderProps };
