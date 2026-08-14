// oxlint-disable typescript/no-deprecated -- @tanstack/react-table v9 legacy compat layer
import type { RowData } from '@tanstack/react-table';
import type { LegacyReactTable } from '@tanstack/react-table/legacy';
import type { ReactElement } from 'react';

import { getColumnMeta } from '@/components/data-grid';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { m } from '@/paraglide/messages';

function DataGridColumnVisibility<TData extends RowData>({
  table,
  trigger,
}: {
  table: LegacyReactTable<TData>;
  trigger: ReactElement<Record<string, unknown>>;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={trigger} />
      <DropdownMenuContent align="end" className="min-w-37.5">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="font-medium">
            {m['dataGrid.visibility.toggleColumns']()}
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
                  onCheckedChange={(value) => column.toggleVisibility(value)}
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
