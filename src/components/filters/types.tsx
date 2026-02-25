import type React from 'react';

export type FilterOption<T = unknown> = {
  className?: string;
  icon?: React.ReactNode;
  label: string;
  metadata?: Record<string, unknown>;
  value: T;
};

export const DEFAULT_OPERATOR_VALUES = [
  'is',
  'is_not',
  'is_any_of',
  'is_not_any_of',
  'includes_all',
  'excludes_all',
  'before',
  'after',
  'between',
  'not_between',
  'contains',
  'not_contains',
  'starts_with',
  'ends_with',
  'is_exactly',
  'equals',
  'not_equals',
  'greater_than',
  'less_than',
  'overlaps',
  'includes',
  'excludes',
  'includes_all_of',
  'includes_any_of',
  'empty',
  'not_empty',
] as const;

export type DefaultFilterOperatorValue =
  (typeof DEFAULT_OPERATOR_VALUES)[number];
export type FilterOperatorValue = DefaultFilterOperatorValue | (string & {});

export type FilterOperator = {
  label: string;
  supportsMultiple?: boolean;
  value: FilterOperatorValue;
};

export type CustomRendererProps<T = unknown> = {
  field: FilterFieldConfig<T>;
  onChange: (values: T[]) => void;
  operator: FilterOperatorValue;
  values: T[];
};

export type FilterFieldGroup<T = unknown> = {
  fields: FilterFieldConfig<T>[];
  group?: string;
};

export type FilterFieldsConfig<T = unknown> =
  | FilterFieldConfig<T>[]
  | FilterFieldGroup<T>[];

export type FilterFieldConfig<T = unknown> = {
  allowCustomValues?: boolean;
  className?: string;
  customRenderer?: (props: CustomRendererProps<T>) => React.ReactNode;
  customValueRenderer?: (
    values: T[],
    options: FilterOption<T>[],
  ) => React.ReactNode;
  defaultOperator?: FilterOperatorValue;
  fields?: FilterFieldConfig<T>[];
  group?: string;
  groupLabel?: string;
  icon?: React.ReactNode;
  key?: string;
  label?: string;
  max?: number;
  maxSelections?: number;
  menuPopupClassName?: string;
  min?: number;
  offLabel?: string;
  onInputChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onLabel?: string;
  onValueChange?: (values: T[]) => void;
  operators?: FilterOperator[];
  options?: FilterOption<T>[];
  pattern?: string;
  placeholder?: string;
  prefix?: string | React.ReactNode;
  searchable?: boolean;
  step?: number;
  suffix?: string | React.ReactNode;
  type?: 'select' | 'multiselect' | 'text' | 'custom' | 'separator';
  validation?: (
    value: unknown,
  ) => boolean | { message?: string; valid: boolean };
  value?: T[];
};

export type Filter<T = unknown> = {
  field: string;
  id: string;
  operator: FilterOperatorValue;
  values: T[];
};

export type FilterGroup<T = unknown> = {
  fields: FilterFieldConfig<T>[];
  filters: Filter<T>[];
  id: string;
  label?: string;
};
