import { type Column } from '@tanstack/react-table';
import { useMemo, useState } from 'react';

import { Icons } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { m } from '@/paraglide/messages';

type DataGridColumnFilterProps<TData, TValue extends string> = {
  column?: Column<TData, TValue>;
  options: {
    icon?: React.ComponentType<{ className?: string }>;
    label: string;
    value: TValue;
  }[];
  title?: string;
};

function DataGridColumnFilter<TData, TValue extends string>({
  column,
  options,
  title,
}: DataGridColumnFilterProps<TData, TValue>) {
  const facets = column?.getFacetedUniqueValues();
  const selectedValues = new Set(column?.getFilterValue() as TValue[]);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredOptions = useMemo(() => {
    if (!searchQuery) return options;
    return options.filter((option) =>
      option.label.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [options, searchQuery]);

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button size="sm" variant="outline">
            <Icons.CirclePlus className="size-4" />
            {title}
            {selectedValues.size > 0 ? (
              <>
                <Separator className="mx-2 h-4" orientation="vertical" />
                <Badge
                  className="rounded-sm px-1 font-normal lg:hidden"
                  variant="secondary"
                >
                  {selectedValues.size}
                </Badge>
                <div className="hidden space-x-1 lg:flex">
                  {selectedValues.size > 2 ? (
                    <Badge
                      className="rounded-sm px-1 font-normal"
                      variant="secondary"
                    >
                      {m['dataGrid.filter.selectedCount']({
                        count: selectedValues.size.toString(),
                      })}
                    </Badge>
                  ) : (
                    options
                      .filter((option) => selectedValues.has(option.value))
                      .map((option) => (
                        <Badge
                          key={option.value}
                          className="rounded-sm px-1 font-normal"
                          variant="secondary"
                        >
                          {option.label}
                        </Badge>
                      ))
                  )}
                </div>
              </>
            ) : null}
          </Button>
        }
      />
      <PopoverContent align="start" className="w-50 p-0">
        <div className="p-2">
          <Input
            className="h-8"
            placeholder={title}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="max-h-75 overflow-y-auto">
          {filteredOptions.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              {m['dataGrid.filter.noResults']()}
            </div>
          ) : (
            <div className="p-1">
              {filteredOptions.map((option) => {
                const isSelected = selectedValues.has(option.value);
                return (
                  <button
                    key={option.value}
                    className={cn(
                      'relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none',
                      'hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground',
                    )}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        selectedValues.delete(option.value);
                      } else {
                        selectedValues.add(option.value);
                      }
                      const filterValues = [...selectedValues];
                      column?.setFilterValue(
                        filterValues.length > 0 ? filterValues : undefined,
                      );
                    }}
                  >
                    <div
                      className={cn(
                        'me-2 flex size-4 items-center justify-center rounded-sm border border-primary',
                        isSelected
                          ? 'bg-primary text-primary-foreground'
                          : 'opacity-50 [&_svg]:invisible',
                      )}
                    >
                      <Icons.Check className="size-4" />
                    </div>
                    {option.icon ? (
                      <option.icon className="mr-2 size-4 text-muted-foreground" />
                    ) : null}
                    <span>{option.label}</span>
                    {facets?.get(option.value) === undefined ? null : (
                      <span className="ms-auto flex size-4 items-center justify-center font-mono text-xs">
                        {facets.get(option.value)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
          {selectedValues.size > 0 ? (
            <>
              <div className="-mx-1 my-1 h-px bg-border" />
              <div className="p-1">
                <button
                  className="relative flex w-full cursor-default items-center justify-center rounded-sm px-2 py-1.5 text-sm outline-hidden select-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                  type="button"
                  onClick={() => column?.setFilterValue(undefined)}
                >
                  {m['dataGrid.filter.clearFilters']()}
                </button>
              </div>
            </>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export { DataGridColumnFilter, type DataGridColumnFilterProps };
