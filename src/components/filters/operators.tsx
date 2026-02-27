import type {
  FilterFieldConfig,
  FilterOperator,
  FilterOperatorValue,
} from '@/components/filters/types';

import { useFilterContext } from '@/components/filters/context';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { m } from '@/paraglide/messages';

function createOperators(): Record<string, FilterOperator[]> {
  return {
    custom: [
      { label: m['filters.operators.is'](), value: 'is' },
      { label: m['filters.operators.after'](), value: 'after' },
      { label: m['filters.operators.before'](), value: 'before' },
      { label: m['filters.operators.between'](), value: 'between' },
      { label: m['filters.operators.empty'](), value: 'empty' },
      { label: m['filters.operators.notEmpty'](), value: 'not_empty' },
    ],
    multiselect: [
      { label: m['filters.operators.isAnyOf'](), value: 'is_any_of' },
      { label: m['filters.operators.isNotAnyOf'](), value: 'is_not_any_of' },
      { label: m['filters.operators.includesAll'](), value: 'includes_all' },
      { label: m['filters.operators.excludesAll'](), value: 'excludes_all' },
      { label: m['filters.operators.empty'](), value: 'empty' },
      { label: m['filters.operators.notEmpty'](), value: 'not_empty' },
    ],
    select: [
      { label: m['filters.operators.is'](), value: 'is' },
      { label: m['filters.operators.isNot'](), value: 'is_not' },
      { label: m['filters.operators.empty'](), value: 'empty' },
      { label: m['filters.operators.notEmpty'](), value: 'not_empty' },
    ],
    text: [
      { label: m['filters.operators.contains'](), value: 'contains' },
      { label: m['filters.operators.notContains'](), value: 'not_contains' },
      { label: m['filters.operators.startsWith'](), value: 'starts_with' },
      { label: m['filters.operators.endsWith'](), value: 'ends_with' },
      { label: m['filters.operators.isExactly'](), value: 'is' },
      { label: m['filters.operators.empty'](), value: 'empty' },
      { label: m['filters.operators.notEmpty'](), value: 'not_empty' },
    ],
  };
}

const OPERATOR_MESSAGES: Record<string, () => string> = {
  after: () => m['filters.operators.after'](),
  before: () => m['filters.operators.before'](),
  between: () => m['filters.operators.between'](),
  contains: () => m['filters.operators.contains'](),
  empty: () => m['filters.operators.empty'](),
  ends_with: () => m['filters.operators.endsWith'](),
  equals: () => m['filters.operators.equals'](),
  excludes: () => m['filters.operators.excludes'](),
  excludes_all: () => m['filters.operators.excludesAll'](),
  greater_than: () => m['filters.operators.greaterThan'](),
  includes: () => m['filters.operators.includes'](),
  includes_all: () => m['filters.operators.includesAll'](),
  includes_all_of: () => m['filters.operators.includesAllOf'](),
  includes_any_of: () => m['filters.operators.includesAnyOf'](),
  is: () => m['filters.operators.is'](),
  is_any_of: () => m['filters.operators.isAnyOf'](),
  is_exactly: () => m['filters.operators.isExactly'](),
  is_not: () => m['filters.operators.isNot'](),
  is_not_any_of: () => m['filters.operators.isNotAnyOf'](),
  less_than: () => m['filters.operators.lessThan'](),
  not_between: () => m['filters.operators.notBetween'](),
  not_contains: () => m['filters.operators.notContains'](),
  not_empty: () => m['filters.operators.notEmpty'](),
  not_equals: () => m['filters.operators.notEquals'](),
  overlaps: () => m['filters.operators.overlaps'](),
  starts_with: () => m['filters.operators.startsWith'](),
};

function formatOperator(operator: string): string {
  const fn = OPERATOR_MESSAGES[operator];
  return fn ? fn() : operator.replaceAll('_', ' ');
}

function getOperatorsForField<T = unknown>(
  field: FilterFieldConfig<T>,
  values: T[],
): FilterOperator[] {
  if (field.operators) return field.operators;

  const operators = createOperators();

  let fieldType = field.type ?? 'select';

  if (fieldType === 'select' && values.length > 1) {
    fieldType = 'multiselect';
  }

  if (fieldType === 'multiselect' || field.type === 'multiselect') {
    return operators.multiselect;
  }

  return operators[fieldType] ?? operators.select;
}

type OperatorDropdownProps<T = unknown> = {
  field: FilterFieldConfig<T>;
  onChange: (operator: FilterOperatorValue) => void;
  operator: FilterOperatorValue;
  values: T[];
};

function OperatorDropdown<T = unknown>({
  field,
  onChange,
  operator,
  values,
}: OperatorDropdownProps<T>) {
  const context = useFilterContext();
  const operators = getOperatorsForField(field, values);

  const operatorLabel =
    operators.find((op) => op.value === operator)?.label ??
    formatOperator(operator);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            className="text-muted-foreground hover:text-foreground"
            size={context.size}
            variant="outline"
          >
            {operatorLabel}
          </Button>
        }
      />
      <DropdownMenuContent align="start" className="w-fit min-w-fit">
        {operators.map((op) => (
          <DropdownMenuItem
            key={op.value}
            className={cn(
              'data-highlighted:bg-accent data-highlighted:text-accent-foreground flex items-center justify-between',
            )}
            onClick={() => onChange(op.value)}
          >
            <span>{op.label}</span>
            <Icons.Check
              className={cn(
                'text-primary ms-auto',
                op.value === operator ? 'opacity-100' : 'opacity-0',
              )}
            />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export {
  createOperators,
  formatOperator,
  getOperatorsForField,
  OperatorDropdown,
};
export type { OperatorDropdownProps };
