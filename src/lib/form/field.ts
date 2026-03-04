import { type } from 'arktype';

/**
 * Run an ArkType schema against a string value, returning the
 * first error message or `undefined` if valid.
 */
function validateField(
  schema: (value: string) => unknown,
  value: string,
): string | undefined {
  const result = schema(value);
  if (result instanceof type.errors) {
    return result.map((e) => e.message).join(', ');
  }
  return undefined;
}

/**
 * Build TanStack Form field-level validators (onBlur, onSubmit)
 * from an ArkType schema.
 */
function fieldValidators(schema: (value: string) => unknown) {
  const validate = ({ value }: { value: string }) =>
    validateField(schema, value);
  return { onBlur: validate, onSubmit: validate };
}

/**
 * Map enum values to display labels for the Select `items` prop.
 */
function toSelectItems<T extends string>(
  values: readonly T[],
  labelFn: (value: T) => string,
): Record<string, string> {
  return Object.fromEntries(values.map((v) => [v, labelFn(v)]));
}

export { fieldValidators, toSelectItems, validateField };
