import { cva } from 'class-variance-authority';
import { useCallback, useMemo } from 'react';

import type { Filter, FilterFieldsConfig } from '@/components/filters/types';

import { useFilterContext } from '@/components/filters/context';
import { getFieldsMap, renderIcon } from '@/components/filters/helpers';
import { OperatorDropdown } from '@/components/filters/operators';
import { RemoveButton } from '@/components/filters/remove-button';
import { ValueSelector } from '@/components/filters/value-selector';
import { ButtonGroup, ButtonGroupText } from '@/components/ui/button-group';
import { cn } from '@/lib/utils';

export const filtersContainerVariants = cva('flex flex-wrap items-center', {
  defaultVariants: {
    size: 'default',
    variant: 'default',
  },
  variants: {
    size: {
      default: 'gap-2.5',
      lg: 'gap-3.5',
      sm: 'gap-1.5',
    },
    variant: {
      default: '',
      solid: 'gap-2',
    },
  },
});

type FiltersContentProps<T = unknown> = {
  fields: FilterFieldsConfig<T>;
  filters: Filter<T>[];
  onChange: (filters: Filter<T>[]) => void;
};

function FiltersContent<T = unknown>({
  fields,
  filters,
  onChange,
}: FiltersContentProps<T>) {
  const context = useFilterContext();
  const fieldsMap = useMemo(() => getFieldsMap(fields), [fields]);

  const updateFilter = useCallback(
    (filterId: string, updates: Partial<Filter<T>>) => {
      onChange(
        filters.map((filter) => {
          if (filter.id === filterId) {
            const updatedFilter = { ...filter, ...updates };
            if (
              updates.operator === 'empty' ||
              updates.operator === 'not_empty'
            ) {
              updatedFilter.values = [] as T[];
            }
            return updatedFilter;
          }
          return filter;
        }),
      );
    },
    [filters, onChange],
  );

  const removeFilter = useCallback(
    (filterId: string) => {
      onChange(filters.filter((filter) => filter.id !== filterId));
    },
    [filters, onChange],
  );

  return (
    <div
      className={cn(
        filtersContainerVariants({
          size: context.size,
          variant: context.variant,
        }),
        context.className,
      )}
    >
      {filters.map((filter) => {
        const field = fieldsMap[filter.field];
        if (!field) return null;

        return (
          <ButtonGroup key={filter.id}>
            <ButtonGroupText>
              {renderIcon(field.icon)}
              {field.label}
            </ButtonGroupText>

            <OperatorDropdown<T>
              field={field}
              operator={filter.operator}
              values={filter.values}
              onChange={(operator) => updateFilter(filter.id, { operator })}
            />

            <ValueSelector<T>
              field={field}
              operator={filter.operator}
              values={filter.values}
              onChange={(values) => updateFilter(filter.id, { values })}
            />

            <RemoveButton onClick={() => removeFilter(filter.id)} />
          </ButtonGroup>
        );
      })}
    </div>
  );
}

export { FiltersContent };
export type { FiltersContentProps };
