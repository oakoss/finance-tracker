import { useForm } from '@tanstack/react-form';

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
import { toSelectItems } from '@/lib/form/field';
import { categoryTypeEnum } from '@/modules/categories/db/schema';
import { createCategorySchema } from '@/modules/categories/validators';
import { m } from '@/paraglide/messages';

const categoryFormSchema = createCategorySchema.pick('name', 'type');

export type CategoryFormValues = {
  name: string;
  parentId?: string;
  type: (typeof categoryTypeEnum.enumValues)[number];
};

type CategoryFormProps = {
  categories?: CategoryListItem[];
  defaultValues?: Partial<CategoryFormValues>;
  editId?: string;
  isSubmitting: boolean;
  onSubmit: (values: CategoryFormValues) => void;
};

const DEFAULT_VALUES: CategoryFormValues = { name: '', type: 'expense' };

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
    validators: { onBlur: categoryFormSchema, onSubmit: categoryFormSchema },
  });

  const categoryTypeItems = toSelectItems(categoryTypeEnum.enumValues, (t) =>
    m[`categories.type.${t}`](),
  );

  // Only show top-level categories (those without a parent) as valid
  // parents — enforces single-level nesting. Exclude self when editing.
  const parentOptions = categories.filter(
    (c) => !c.parentId && c.id !== editId,
  );
  const noneLabel = m['categories.form.parentNone']();
  const parentItems = Object.fromEntries([
    ['__none__', noneLabel],
    ...parentOptions.map((c) => [c.id, c.name] as const),
  ]);

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
            <FieldLabel htmlFor="category-type">
              {m['categories.form.type']()}
            </FieldLabel>
            <Select
              disabled={isSubmitting}
              items={categoryTypeItems}
              value={field.state.value}
              onValueChange={(v) => {
                if (v) {
                  field.handleChange(v);
                  field.handleBlur();
                }
              }}
            >
              <SelectTrigger id="category-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categoryTypeEnum.enumValues.map((t) => (
                  <SelectItem key={t} value={t}>
                    {categoryTypeItems[t]}
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
            <FieldLabel htmlFor="category-parent">
              {m['categories.form.parent']()}
            </FieldLabel>
            <Select
              disabled={isSubmitting}
              items={parentItems}
              value={field.state.value ?? '__none__'}
              onValueChange={(v) => {
                field.handleChange(
                  v === '__none__' ? undefined : (v ?? undefined),
                );
                field.handleBlur();
              }}
            >
              <SelectTrigger id="category-parent">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">{noneLabel}</SelectItem>
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
