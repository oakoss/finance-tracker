import { useForm } from '@tanstack/react-form';
import { type } from 'arktype';

import type { CategoryListItem } from '@/modules/categories/api/list-categories';

import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { categoryTypeEnum } from '@/modules/finance/db/schema';
import { m } from '@/paraglide/messages';

const categoryFormSchema = type({
  name: '0 < string <= 100',
  parentId: 'string',
  type: type.enumerated(...categoryTypeEnum.enumValues),
});

export type CategoryFormValues = typeof categoryFormSchema.infer;

type CategoryFormProps = {
  categories?: CategoryListItem[];
  defaultValues?: Partial<CategoryFormValues>;
  editId?: string;
  isSubmitting: boolean;
  onSubmit: (values: CategoryFormValues) => void;
};

const DEFAULT_VALUES: CategoryFormValues = {
  name: '',
  parentId: '',
  type: 'expense',
};

export function CategoryForm({
  categories = [],
  defaultValues,
  editId,
  isSubmitting,
  onSubmit,
}: CategoryFormProps) {
  const form = useForm({
    defaultValues: { ...DEFAULT_VALUES, ...defaultValues },
    onSubmit: ({ value }) => onSubmit(value),
    validators: {
      onBlur: categoryFormSchema,
      onSubmit: categoryFormSchema,
    },
  });

  // Only show top-level categories as valid parents (one-level nesting).
  // Exclude self and current children when editing.
  const parentOptions = categories.filter(
    (c) => !c.parentId && c.id !== editId,
  );

  return (
    <form
      className="grid gap-4"
      id="category-form"
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void form.handleSubmit();
      }}
    >
      <form.Field name="name">
        {(field) => (
          <Field data-invalid={field.state.meta.errors.length > 0}>
            <FieldLabel htmlFor="category-name">
              {m['categories.form.name']()}
            </FieldLabel>
            <Input
              disabled={isSubmitting}
              id="category-name"
              name={field.name}
              placeholder="e.g. Groceries"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
            />
            <FieldError errors={field.state.meta.errors} />
          </Field>
        )}
      </form.Field>

      <form.Field name="type">
        {(field) => (
          <Field>
            <FieldLabel>{m['categories.form.type']()}</FieldLabel>
            <Select
              disabled={isSubmitting}
              value={field.state.value}
              onValueChange={(v) => field.handleChange(v!)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categoryTypeEnum.enumValues.map((t) => (
                  <SelectItem key={t} value={t}>
                    {m[`categories.type.${t}`]()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}
      </form.Field>

      <form.Field name="parentId">
        {(field) => (
          <Field>
            <FieldLabel>{m['categories.form.parent']()}</FieldLabel>
            <Select
              disabled={isSubmitting}
              value={field.state.value || '__none__'}
              onValueChange={(v) =>
                field.handleChange(v === '__none__' ? '' : v!)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">
                  {m['categories.form.parentNone']()}
                </SelectItem>
                {parentOptions.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}
      </form.Field>
    </form>
  );
}
