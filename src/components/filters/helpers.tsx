import type {
  Filter,
  FilterFieldConfig,
  FilterFieldGroup,
  FilterFieldsConfig,
  FilterGroup,
} from '@/components/filters/types';

function isFieldGroup<T = unknown>(
  item: FilterFieldConfig<T> | FilterFieldGroup<T>,
): item is FilterFieldGroup<T> {
  return 'fields' in item && Array.isArray(item.fields);
}

function isGroupLevelField<T = unknown>(field: FilterFieldConfig<T>): boolean {
  return Boolean(field.group && field.fields);
}

function flattenFields<T = unknown>(
  fields: FilterFieldsConfig<T>,
): FilterFieldConfig<T>[] {
  const result: FilterFieldConfig<T>[] = [];

  for (const item of fields) {
    if (isFieldGroup(item)) {
      result.push(...item.fields);
      continue;
    }

    if (isGroupLevelField(item)) {
      result.push(...(item.fields ?? []));
      continue;
    }

    result.push(item);
  }

  return result;
}

function getFieldsMap<T = unknown>(
  fields: FilterFieldsConfig<T>,
): Record<string, FilterFieldConfig<T>> {
  const flatFields = flattenFields(fields);
  const result: Record<string, FilterFieldConfig<T>> = {};

  for (const field of flatFields) {
    if (field.key) {
      result[field.key] = field;
    }
  }

  return result;
}

function renderIcon(icon: React.ReactNode) {
  if (!icon) {
    return null;
  }

  return <span className="inline-flex">{icon}</span>;
}

function validateInput(value: string, pattern?: string): boolean {
  if (!pattern || !value) return true;
  const regex = new RegExp(pattern);
  return regex.test(value);
}

function createFilter<T = unknown>(
  field: string,
  operator?: string,
  values: T[] = [],
): Filter<T> {
  return {
    field,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
    operator: operator ?? 'is',
    values,
  };
}

function createFilterGroup<T = unknown>(
  id: string,
  label: string,
  fields: FilterFieldConfig<T>[],
  initialFilters: Filter<T>[] = [],
): FilterGroup<T> {
  return {
    fields,
    filters: initialFilters,
    id,
    label,
  };
}

export {
  createFilter,
  createFilterGroup,
  flattenFields,
  getFieldsMap,
  isFieldGroup,
  isGroupLevelField,
  renderIcon,
  validateInput,
};
