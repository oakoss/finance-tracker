import { useForm } from '@tanstack/react-form';

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@/components/ui/combobox';
import { DatePicker } from '@/components/ui/date-picker';
import { Field, FieldError, FieldLabel, FieldSet } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toSelectItems } from '@/lib/form/field';
import {
  accountOwnerTypeEnum,
  accountTypeEnum,
} from '@/modules/accounts/db/schema';
import { createAccountBaseSchema } from '@/modules/accounts/validators';
import { m } from '@/paraglide/messages';

const CURRENCY_CODES = Intl.supportedValuesOf('currency');

// Derive form validation from the server schema. Only pick fields
// whose form-state type matches the server type. Fields like
// initialBalanceCents (string -> integer), openedAt (string -> date),
// and terms (string sub-fields -> typed object) are converted in the
// dialog's handleSubmit before being passed to the server.
const accountFormSchema = createAccountBaseSchema.pick(
  'currency',
  'name',
  'type',
);

type AccountFormValues = {
  accountNumberMask: string;
  currency: string;
  initialBalanceCents: string;
  institution: string;
  name: string;
  openedAt: string;
  ownerType: (typeof accountOwnerTypeEnum.enumValues)[number];
  terms: {
    aprBps: string;
    dueDay: string;
    minPaymentType: 'fixed' | 'percentage';
    minPaymentValue: string;
    statementDay: string;
  };
  type: (typeof accountTypeEnum.enumValues)[number];
};

type AccountFormProps = {
  defaultValues?: Partial<AccountFormValues>;
  isSubmitting: boolean;
  onSubmit: (values: AccountFormValues) => void;
};

const DEFAULT_VALUES: AccountFormValues = {
  accountNumberMask: '',
  currency: 'USD',
  initialBalanceCents: '',
  institution: '',
  name: '',
  openedAt: '',
  ownerType: 'personal',
  terms: {
    aprBps: '',
    dueDay: '',
    minPaymentType: 'percentage',
    minPaymentValue: '',
    statementDay: '',
  },
  type: 'checking',
};

function hasTerms(accountType: string): boolean {
  return accountType === 'credit_card' || accountType === 'loan';
}

export function AccountForm({
  defaultValues,
  isSubmitting,
  onSubmit,
}: AccountFormProps) {
  const accountTypeItems = toSelectItems(accountTypeEnum.enumValues, (t) =>
    m[`accounts.type.${t}`](),
  );
  const ownerTypeItems = toSelectItems(accountOwnerTypeEnum.enumValues, (t) =>
    m[`accounts.ownerType.${t}`](),
  );

  const form = useForm({
    defaultValues: { ...DEFAULT_VALUES, ...defaultValues },
    onSubmit: ({ value }) => onSubmit(value),
    validators: { onSubmit: accountFormSchema },
  });

  return (
    <form
      noValidate
      className="grid gap-4"
      id="account-form"
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void form.handleSubmit();
      }}
    >
      <form.Field name="name">
        {(field) => (
          <Field data-invalid={field.state.meta.errors.length > 0}>
            <FieldLabel htmlFor="account-name">
              {m['accounts.form.name']()}
            </FieldLabel>
            <Input
              disabled={isSubmitting}
              id="account-name"
              name={field.name}
              placeholder="e.g. Chase Checking"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
            />
            <FieldError errors={field.state.meta.errors} />
          </Field>
        )}
      </form.Field>

      <div className="grid grid-cols-2 gap-4">
        <form.Field name="type">
          {(field) => (
            <Field>
              <FieldLabel htmlFor="account-type">
                {m['accounts.form.type']()}
              </FieldLabel>
              <Select
                disabled={isSubmitting}
                items={accountTypeItems}
                value={field.state.value}
                onValueChange={(v) => {
                  if (v) {
                    field.handleChange(v);
                    field.handleBlur();
                  }
                }}
              >
                <SelectTrigger id="account-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {accountTypeEnum.enumValues.map((t) => (
                    <SelectItem key={t} value={t}>
                      {accountTypeItems[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}
        </form.Field>

        <form.Field name="currency">
          {(field) => (
            <Field data-invalid={field.state.meta.errors.length > 0}>
              <FieldLabel htmlFor="account-currency">
                {m['accounts.form.currency']()}
              </FieldLabel>
              <Combobox
                value={field.state.value}
                onValueChange={(v) => {
                  if (v) field.handleChange(v);
                }}
              >
                <ComboboxInput
                  disabled={isSubmitting}
                  id="account-currency"
                  placeholder="USD"
                  onBlur={field.handleBlur}
                />
                <ComboboxContent>
                  <ComboboxList>
                    <ComboboxEmpty>
                      {m['filters.noResultsFound']()}
                    </ComboboxEmpty>
                    {CURRENCY_CODES.map((code) => (
                      <ComboboxItem key={code} value={code}>
                        {code}
                      </ComboboxItem>
                    ))}
                  </ComboboxList>
                </ComboboxContent>
              </Combobox>
              <FieldError errors={field.state.meta.errors} />
            </Field>
          )}
        </form.Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <form.Field name="ownerType">
          {(field) => (
            <Field>
              <FieldLabel htmlFor="owner-type">
                {m['accounts.form.ownerType']()}
              </FieldLabel>
              <Select
                disabled={isSubmitting}
                items={ownerTypeItems}
                value={field.state.value}
                onValueChange={(v) => {
                  if (v) {
                    field.handleChange(v);
                    field.handleBlur();
                  }
                }}
              >
                <SelectTrigger id="owner-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {accountOwnerTypeEnum.enumValues.map((t) => (
                    <SelectItem key={t} value={t}>
                      {ownerTypeItems[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}
        </form.Field>

        <form.Field name="institution">
          {(field) => (
            <Field>
              <FieldLabel htmlFor="institution">
                {m['accounts.form.institution']()}
              </FieldLabel>
              <Input
                disabled={isSubmitting}
                id="institution"
                name={field.name}
                placeholder="e.g. Chase"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
              />
            </Field>
          )}
        </form.Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <form.Field name="accountNumberMask">
          {(field) => (
            <Field>
              <FieldLabel htmlFor="account-number-mask">
                {m['accounts.form.accountNumberMask']()}
              </FieldLabel>
              <Input
                disabled={isSubmitting}
                id="account-number-mask"
                maxLength={4}
                name={field.name}
                placeholder="1234"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
              />
            </Field>
          )}
        </form.Field>

        <form.Field name="openedAt">
          {(field) => (
            <Field>
              <FieldLabel htmlFor="opened-at">
                {m['accounts.form.openedAt']()}
              </FieldLabel>
              <DatePicker
                disabled={isSubmitting}
                id="opened-at"
                value={field.state.value}
                onBlur={field.handleBlur}
                onValueChange={field.handleChange}
              />
            </Field>
          )}
        </form.Field>
      </div>

      <form.Field name="initialBalanceCents">
        {(field) => (
          <Field>
            <FieldLabel htmlFor="initial-balance">
              {m['accounts.form.initialBalance']()}
            </FieldLabel>
            <Input
              disabled={isSubmitting}
              id="initial-balance"
              name={field.name}
              placeholder="0.00"
              step="0.01"
              type="number"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
            />
          </Field>
        )}
      </form.Field>

      <form.Subscribe selector={(s) => s.values.type}>
        {(accountType) =>
          hasTerms(accountType) && (
            <FieldSet className="rounded-lg border p-4">
              <legend className="px-1 text-sm leading-none font-medium">
                {m['accounts.form.termsSection']()}
              </legend>

              <div className="grid grid-cols-2 gap-4">
                <form.Field name="terms.aprBps">
                  {(field) => (
                    <Field>
                      <FieldLabel htmlFor="apr-bps">
                        {m['accounts.form.aprBps']()}
                      </FieldLabel>
                      <Input
                        disabled={isSubmitting}
                        id="apr-bps"
                        name={field.name}
                        placeholder="2499"
                        type="number"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                      />
                    </Field>
                  )}
                </form.Field>

                <form.Field name="terms.dueDay">
                  {(field) => (
                    <Field>
                      <FieldLabel htmlFor="due-day">
                        {m['accounts.form.dueDay']()}
                      </FieldLabel>
                      <Input
                        disabled={isSubmitting}
                        id="due-day"
                        max={28}
                        min={1}
                        name={field.name}
                        placeholder="15"
                        type="number"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                      />
                    </Field>
                  )}
                </form.Field>
              </div>

              <form.Field name="terms.statementDay">
                {(field) => (
                  <Field>
                    <FieldLabel htmlFor="statement-day">
                      {m['accounts.form.statementDay']()}
                    </FieldLabel>
                    <Input
                      disabled={isSubmitting}
                      id="statement-day"
                      max={28}
                      min={1}
                      name={field.name}
                      placeholder="20"
                      type="number"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                  </Field>
                )}
              </form.Field>
            </FieldSet>
          )
        }
      </form.Subscribe>
    </form>
  );
}

function parseIntOrNull(value: string): number | null {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

export function parseFormTerms(values: AccountFormValues) {
  if (!hasTerms(values.type)) return;
  return {
    aprBps: parseIntOrNull(values.terms.aprBps),
    dueDay: parseIntOrNull(values.terms.dueDay),
    minPaymentType: values.terms.minPaymentType || null,
    minPaymentValue: parseIntOrNull(values.terms.minPaymentValue),
    statementDay: parseIntOrNull(values.terms.statementDay),
  };
}

export type { AccountFormValues };
