import { useForm } from '@tanstack/react-form';
import { type } from 'arktype';
import { useState } from 'react';

import type { AccountListItem } from '@/modules/accounts/api/list-accounts';
import type { CategoryListItem } from '@/modules/categories/api/list-categories';
import type { PayeeListItem } from '@/modules/transactions/api/list-payees';
import type { TagListItem } from '@/modules/transactions/api/list-tags';

import { Badge } from '@/components/ui/badge';
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@/components/ui/combobox';
import { DatePicker } from '@/components/ui/date-picker';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { toSelectItems } from '@/lib/form/field';
import { todayISODateString } from '@/lib/i18n/date';
import { transactionDirectionEnum } from '@/modules/transactions/db/schema';
import { createTransactionSchema } from '@/modules/transactions/validators';
import { m } from '@/paraglide/messages';

// Derive form validation from the server schema. Fields whose form
// type differs from the server type (amount is a string here but
// amountCents is an integer server-side; direction is required in the
// form but optional server-side; categoryId and memo have different
// nullability) are merged separately.
const positiveNumericString = type('string > 0').narrow(
  (s, ctx) => Number.parseFloat(s) > 0 || ctx.mustBe('a positive number'),
);

const transactionFormSchema = createTransactionSchema
  .pick('accountId', 'description', 'pending', 'transactionAt')
  .merge(
    type({
      amount: positiveNumericString,
      'categoryId?': 'string',
      direction: type.enumerated(...transactionDirectionEnum.enumValues),
      'memo?': 'string',
    }),
  );

export type TransactionFormValues = typeof transactionFormSchema.infer;

type PayeeState = { newPayeeName?: string; payeeId?: string };
type TagState = { newTagNames: string[]; tagIds: string[] };

type TransactionFormProps = {
  accounts: AccountListItem[];
  categories: CategoryListItem[];
  defaultValues?: Partial<TransactionFormValues> & {
    payeeId?: string;
    tagIds?: string[];
  };
  isSubmitting: boolean;
  onSubmit: (
    values: TransactionFormValues,
    payeeState: PayeeState,
    tagState: TagState,
  ) => void;
  payees: PayeeListItem[];
  tags: TagListItem[];
};

function getDefaultValues(): TransactionFormValues {
  return {
    accountId: '',
    amount: '',
    description: '',
    direction: 'debit',
    memo: '',
    pending: false,
    transactionAt: todayISODateString(),
  };
}

export function TransactionForm({
  accounts,
  categories,
  defaultValues,
  isSubmitting,
  onSubmit,
  payees: payeeList,
  tags: tagList,
}: TransactionFormProps) {
  // Payee state
  const [selectedPayeeId, setSelectedPayeeId] = useState<string | null>(
    defaultValues?.payeeId ?? null,
  );
  const [newPayeeName, setNewPayeeName] = useState<string | null>(null);
  const [payeeSearch, setPayeeSearch] = useState(() => {
    if (defaultValues?.payeeId) {
      const p = payeeList.find((x) => x.id === defaultValues.payeeId);
      return p?.name ?? '';
    }
    return '';
  });

  // Tag state
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(
    defaultValues?.tagIds ?? [],
  );
  const [newTagNames, setNewTagNames] = useState<string[]>([]);
  const [tagSearch, setTagSearch] = useState('');

  const filteredPayees = payeeList.filter((p) =>
    p.name.toLowerCase().includes(payeeSearch.toLowerCase()),
  );
  const showCreatePayee =
    payeeSearch.trim().length > 0 &&
    !payeeList.some(
      (p) => p.name.toLowerCase() === payeeSearch.trim().toLowerCase(),
    );

  const filteredTags = tagList.filter(
    (t) =>
      t.name.toLowerCase().includes(tagSearch.toLowerCase()) &&
      !selectedTagIds.includes(t.id),
  );
  const showCreateTag =
    tagSearch.trim().length > 0 &&
    !tagList.some(
      (t) => t.name.toLowerCase() === tagSearch.trim().toLowerCase(),
    ) &&
    !newTagNames.some(
      (n) => n.toLowerCase() === tagSearch.trim().toLowerCase(),
    );

  const directionItems = toSelectItems(
    transactionDirectionEnum.enumValues,
    (d) => m[`transactions.direction.${d}`](),
  );
  const accountSelectLabel = m['transactions.form.accountId']();
  const accountItems = Object.fromEntries([
    ['', accountSelectLabel],
    ...accounts.map((a) => [a.account.id, a.account.name]),
  ]);
  const categoryNoneLabel = m['transactions.form.categoryNone']();
  const categoryItems = Object.fromEntries([
    ['__none__', categoryNoneLabel],
    ...categories.map((c) => [c.id, c.name] as const),
  ]);

  const {
    payeeId: _defaultPayeeId,
    tagIds: _defaultTagIds,
    ...formDefaults
  } = defaultValues ?? {};

  const form = useForm({
    defaultValues: { ...getDefaultValues(), ...formDefaults },
    onSubmit: ({ value }) => {
      const payeeState: PayeeState = {};
      if (newPayeeName) {
        payeeState.newPayeeName = newPayeeName;
      } else if (selectedPayeeId) {
        payeeState.payeeId = selectedPayeeId;
      }
      onSubmit(value, payeeState, { newTagNames, tagIds: selectedTagIds });
    },
    validators: {
      onBlur: transactionFormSchema,
      onSubmit: transactionFormSchema,
    },
  });

  return (
    <form
      className="grid gap-4"
      id="transaction-form"
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void form.handleSubmit();
      }}
    >
      <div className="grid grid-cols-2 gap-4">
        <form.Field name="transactionAt">
          {(field) => (
            <Field data-invalid={field.state.meta.errors.length > 0}>
              <FieldLabel htmlFor="transaction-date">
                {m['transactions.form.transactionAt']()}
              </FieldLabel>
              <DatePicker
                disabled={isSubmitting}
                id="transaction-date"
                value={field.state.value}
                onBlur={field.handleBlur}
                onValueChange={field.handleChange}
              />
              <FieldError errors={field.state.meta.errors} />
            </Field>
          )}
        </form.Field>

        <form.Field name="direction">
          {(field) => (
            <Field>
              <FieldLabel htmlFor="transaction-direction">
                {m['transactions.form.direction']()}
              </FieldLabel>
              <Select
                disabled={isSubmitting}
                items={directionItems}
                value={field.state.value}
                onValueChange={(v) => {
                  if (v) {
                    field.handleChange(v);
                    field.handleBlur();
                  }
                }}
              >
                <SelectTrigger id="transaction-direction">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {transactionDirectionEnum.enumValues.map((d) => (
                    <SelectItem key={d} value={d}>
                      {directionItems[d]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}
        </form.Field>
      </div>

      <form.Field name="description">
        {(field) => (
          <Field data-invalid={field.state.meta.errors.length > 0}>
            <FieldLabel htmlFor="transaction-description">
              {m['transactions.form.description']()}
            </FieldLabel>
            <Input
              disabled={isSubmitting}
              id="transaction-description"
              name={field.name}
              placeholder={m['transactions.form.descriptionPlaceholder']()}
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
            />
            <FieldError errors={field.state.meta.errors} />
          </Field>
        )}
      </form.Field>

      <div className="grid grid-cols-2 gap-4">
        <form.Field name="amount">
          {(field) => (
            <Field data-invalid={field.state.meta.errors.length > 0}>
              <FieldLabel htmlFor="transaction-amount">
                {m['transactions.form.amount']()}
              </FieldLabel>
              <Input
                disabled={isSubmitting}
                id="transaction-amount"
                min="0.01"
                name={field.name}
                placeholder="0.00"
                step="0.01"
                type="number"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
              />
              <FieldError errors={field.state.meta.errors} />
            </Field>
          )}
        </form.Field>

        <form.Field name="pending">
          {(field) => (
            <Field>
              <FieldLabel>{m['transactions.form.pending']()}</FieldLabel>
              <div className="flex h-9 items-center">
                <Switch
                  checked={field.state.value ?? false}
                  disabled={isSubmitting}
                  onCheckedChange={field.handleChange}
                />
              </div>
            </Field>
          )}
        </form.Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <form.Field name="accountId">
          {(field) => (
            <Field data-invalid={field.state.meta.errors.length > 0}>
              <FieldLabel htmlFor="transaction-account">
                {m['transactions.form.accountId']()}
              </FieldLabel>
              <Select
                disabled={isSubmitting}
                items={accountItems}
                value={field.state.value}
                onValueChange={(v) => {
                  if (v) {
                    field.handleChange(v);
                    field.handleBlur();
                  }
                }}
              >
                <SelectTrigger id="transaction-account">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.account.id} value={a.account.id}>
                      {a.account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError errors={field.state.meta.errors} />
            </Field>
          )}
        </form.Field>

        <form.Field name="categoryId">
          {(field) => (
            <Field>
              <FieldLabel htmlFor="transaction-category">
                {m['transactions.form.categoryId']()}
              </FieldLabel>
              <Select
                disabled={isSubmitting}
                items={categoryItems}
                value={field.state.value ?? '__none__'}
                onValueChange={(v) => {
                  field.handleChange(
                    v === '__none__' ? undefined : (v ?? undefined),
                  );
                  field.handleBlur();
                }}
              >
                <SelectTrigger id="transaction-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">{categoryNoneLabel}</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}
        </form.Field>
      </div>

      <Field>
        <FieldLabel>{m['transactions.form.payee']()}</FieldLabel>
        <Combobox
          value={selectedPayeeId ?? ''}
          onValueChange={(id) => {
            if (id === '__new__') {
              setNewPayeeName(payeeSearch.trim());
              setSelectedPayeeId(null);
            } else {
              setSelectedPayeeId(String(id));
              setNewPayeeName(null);
              const p = payeeList.find((x) => x.id === id);
              if (p) setPayeeSearch(p.name);
            }
          }}
        >
          <ComboboxInput
            disabled={isSubmitting}
            placeholder={m['transactions.form.payeeNone']()}
            showClear={!!(selectedPayeeId ?? newPayeeName)}
            value={payeeSearch}
            onChange={(e) => {
              setPayeeSearch(e.target.value);
              if (!e.target.value) {
                setSelectedPayeeId(null);
                setNewPayeeName(null);
              }
            }}
          />
          <ComboboxContent>
            <ComboboxList>
              <ComboboxEmpty>{m['filters.noResultsFound']()}</ComboboxEmpty>
              {filteredPayees.map((p) => (
                <ComboboxItem key={p.id} value={p.id}>
                  {p.name}
                </ComboboxItem>
              ))}
              {showCreatePayee && (
                <ComboboxItem value="__new__">
                  {m['transactions.form.createPayee']({
                    name: payeeSearch.trim(),
                  })}
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
      </Field>

      <Field>
        <FieldLabel>{m['transactions.form.tags']()}</FieldLabel>
        {(selectedTagIds.length > 0 || newTagNames.length > 0) && (
          <div className="mb-2 flex flex-wrap gap-1">
            {selectedTagIds.map((tagId) => {
              const tag = tagList.find((t) => t.id === tagId);
              return tag ? (
                <Badge
                  key={tagId}
                  className="cursor-pointer"
                  variant="secondary"
                  onClick={() =>
                    setSelectedTagIds((prev) =>
                      prev.filter((id) => id !== tagId),
                    )
                  }
                >
                  {tag.name} &times;
                </Badge>
              ) : null;
            })}
            {newTagNames.map((name) => (
              <Badge
                key={`new-${name}`}
                className="cursor-pointer"
                variant="outline"
                onClick={() =>
                  setNewTagNames((prev) => prev.filter((n) => n !== name))
                }
              >
                {name} &times;
              </Badge>
            ))}
          </div>
        )}
        <Combobox
          value={null}
          onValueChange={(id) => {
            if (id === '__create_tag__') {
              const trimmed = tagSearch.trim();
              if (trimmed) {
                setNewTagNames((prev) => [...prev, trimmed]);
                setTagSearch('');
              }
            } else if (typeof id === 'string' && id) {
              setSelectedTagIds((prev) =>
                prev.includes(id) ? prev : [...prev, id],
              );
              setTagSearch('');
            }
          }}
        >
          <ComboboxInput
            disabled={isSubmitting}
            placeholder={m['transactions.form.tags']()}
            value={tagSearch}
            onChange={(e) => setTagSearch(e.target.value)}
          />
          <ComboboxContent>
            <ComboboxList>
              <ComboboxEmpty>{m['filters.noResultsFound']()}</ComboboxEmpty>
              {filteredTags.map((t) => (
                <ComboboxItem key={t.id} value={t.id}>
                  {t.name}
                </ComboboxItem>
              ))}
              {showCreateTag && (
                <ComboboxItem value="__create_tag__">
                  {m['transactions.form.createTag']({
                    name: tagSearch.trim(),
                  })}
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
      </Field>

      <form.Field name="memo">
        {(field) => (
          <Field>
            <FieldLabel htmlFor="transaction-memo">
              {m['transactions.form.memo']()}
            </FieldLabel>
            <Textarea
              disabled={isSubmitting}
              id="transaction-memo"
              name={field.name}
              rows={2}
              value={field.state.value ?? ''}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
            />
          </Field>
        )}
      </form.Field>
    </form>
  );
}
