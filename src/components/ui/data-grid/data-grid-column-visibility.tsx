import { type Column, type Table } from '@tanstack/react-table';
import { type ReactElement } from 'react';

import { type DataGridColumnMeta } from '@/components/ui/data-grid/data-grid';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

function DataGridColumnVisibility<TData>({
  table,
  trigger,
}: {
  table: Table<TData>;
  trigger: ReactElement<Record<string, unknown>>;
}) {
  function getColumnMeta(column: Column<TData, unknown>) {
    return column.columnDef.meta as DataGridColumnMeta<TData> | undefined;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={trigger} />
      <DropdownMenuContent align="end" className="min-w-37.5">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="font-medium">
            Toggle Columns
          </DropdownMenuLabel>
          {table
            .getAllColumns()
            .filter(
              (column) =>
                column.accessorFn !== undefined && column.getCanHide(),
            )
            .map((column) => {
              const meta = getColumnMeta(column);

              return (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  checked={column.getIsVisible()}
                  className="capitalize"
                  onCheckedChange={(value) => column.toggleVisibility(!!value)}
                  onSelect={(event) => event.preventDefault()}
                >
                  {meta?.headerTitle ?? column.id}
                </DropdownMenuCheckboxItem>
              );
            })}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export { DataGridColumnVisibility };
