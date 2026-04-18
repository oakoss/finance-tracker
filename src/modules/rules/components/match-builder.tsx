import type { AccountListItem } from '@/modules/accounts/api/list-accounts';

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn, omit } from '@/lib/utils';
import {
  MATCH_REGEX_MAX_LENGTH,
  type MatchPredicate,
} from '@/modules/rules/models';
import { m } from '@/paraglide/messages';

type Kind = MatchPredicate['kind'];
type AmountOp = NonNullable<MatchPredicate['amountOp']>;
type Direction = NonNullable<MatchPredicate['direction']>;

const KIND_OPTIONS: { label: () => string; value: Kind }[] = [
  { label: () => m['rules.form.kindContains'](), value: 'contains' },
  { label: () => m['rules.form.kindStartsWith'](), value: 'starts_with' },
  { label: () => m['rules.form.kindEndsWith'](), value: 'ends_with' },
  { label: () => m['rules.form.kindExact'](), value: 'exact' },
  { label: () => m['rules.form.kindRegex'](), value: 'regex' },
];
const KIND_VALUES = new Set<string>(KIND_OPTIONS.map((o) => o.value));

const AMOUNT_OPS: { label: () => string; value: AmountOp | 'none' }[] = [
  { label: () => m['rules.form.amountOpLabel'](), value: 'none' },
  { label: () => m['rules.form.amountGte'](), value: 'gte' },
  { label: () => m['rules.form.amountLte'](), value: 'lte' },
  { label: () => m['rules.form.amountEq'](), value: 'eq' },
  { label: () => m['rules.form.amountBetween'](), value: 'between' },
];
const AMOUNT_OP_VALUES = new Set<string>(AMOUNT_OPS.map((o) => o.value));

const DIRECTIONS: { label: () => string; value: Direction }[] = [
  { label: () => m['rules.form.directionBoth'](), value: 'both' },
  { label: () => m['rules.form.directionDebit'](), value: 'debit' },
  { label: () => m['rules.form.directionCredit'](), value: 'credit' },
];
const DIRECTION_VALUES = new Set<string>(DIRECTIONS.map((o) => o.value));

type MatchBuilderProps = {
  accounts: AccountListItem[];
  disabled: boolean | undefined;
  errors?: { kind?: string; value?: string };
  onChange: (next: MatchPredicate) => void;
  value: MatchPredicate;
};

export function MatchBuilder({
  accounts,
  disabled,
  errors,
  onChange,
  value,
}: MatchBuilderProps) {
  const overLimit =
    value.kind === 'regex' && value.value.length > MATCH_REGEX_MAX_LENGTH;

  const setKind = (kind: Kind) => onChange({ ...value, kind });
  const setValue = (v: string) => onChange({ ...value, value: v });

  const setAmountOp = (op: 'none' | AmountOp) => {
    const cleared = omit(value, 'amountMaxCents', 'amountMinCents', 'amountOp');
    if (op === 'none') {
      onChange(cleared);
      return;
    }
    // Strip the bound that's now hidden: gte keeps only min, lte keeps only max.
    if (op === 'gte' && value.amountMinCents !== undefined) {
      onChange({
        ...cleared,
        amountMinCents: value.amountMinCents,
        amountOp: 'gte',
      });
      return;
    }
    if (op === 'lte' && value.amountMaxCents !== undefined) {
      onChange({
        ...cleared,
        amountMaxCents: value.amountMaxCents,
        amountOp: 'lte',
      });
      return;
    }
    onChange({ ...value, amountOp: op });
  };

  const setDirection = (d: Direction) => {
    if (d === 'both') {
      onChange(omit(value, 'direction'));
      return;
    }
    onChange({ ...value, direction: d });
  };

  const setAccountId = (id: string) => {
    if (id === '__any__') {
      onChange(omit(value, 'accountId'));
      return;
    }
    onChange({ ...value, accountId: id });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-[200px_1fr]">
        <Field>
          <FieldLabel>{m['rules.form.kindLabel']()}</FieldLabel>
          <Select
            disabled={disabled}
            value={value.kind}
            onValueChange={(v) => {
              if (v === null || !KIND_VALUES.has(v)) return;
              setKind(v);
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {KIND_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field data-invalid={!!errors?.value || overLimit}>
          <FieldLabel>{m['rules.form.valueLabel']()}</FieldLabel>
          <Input
            className={cn('font-mono', overLimit && 'border-destructive')}
            disabled={disabled}
            placeholder={m['rules.form.valuePlaceholder']()}
            value={value.value}
            onChange={(e) => setValue(e.target.value)}
          />
          <FieldError
            errors={
              overLimit
                ? [
                    m['rules.form.regexTooLong']({
                      max: String(MATCH_REGEX_MAX_LENGTH),
                    }),
                  ]
                : errors?.value
                  ? [errors.value]
                  : []
            }
          />
        </Field>
      </div>

      <Collapsible>
        <CollapsibleTrigger className="text-sm font-medium text-muted-foreground hover:text-foreground">
          {m['rules.form.advanced']()}
        </CollapsibleTrigger>
        <CollapsibleContent className="grid gap-3 pt-3 sm:grid-cols-2">
          <Field>
            <FieldLabel>{m['rules.form.directionLabel']()}</FieldLabel>
            <Select
              disabled={disabled}
              value={value.direction ?? 'both'}
              onValueChange={(v) => {
                if (v === null || !DIRECTION_VALUES.has(v)) return;
                setDirection(v as Direction);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DIRECTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel>{m['rules.form.accountLabel']()}</FieldLabel>
            <Select
              disabled={disabled}
              value={value.accountId ?? '__any__'}
              onValueChange={(v) => {
                if (v === null || v.length === 0) return;
                setAccountId(v);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__any__">
                  {m['rules.form.accountPlaceholder']()}
                </SelectItem>
                {accounts.map((a) => (
                  <SelectItem key={a.account.id} value={a.account.id}>
                    {a.account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel>{m['rules.form.amountOpLabel']()}</FieldLabel>
            <Select
              disabled={disabled}
              value={value.amountOp ?? 'none'}
              onValueChange={(v) => {
                if (v === null || !AMOUNT_OP_VALUES.has(v)) return;
                setAmountOp(v as 'none' | AmountOp);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AMOUNT_OPS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {value.amountOp && (
            <div className="grid gap-3 sm:col-span-2 sm:grid-cols-2">
              {value.amountOp !== 'lte' && (
                <Field>
                  <FieldLabel>{m['rules.form.amountMinLabel']()}</FieldLabel>
                  <Input
                    disabled={disabled}
                    inputMode="numeric"
                    type="number"
                    value={value.amountMinCents ?? ''}
                    onChange={(e) => {
                      if (e.target.value === '') {
                        onChange(omit(value, 'amountMinCents'));
                      } else {
                        onChange({
                          ...value,
                          amountMinCents: Number(e.target.value),
                        });
                      }
                    }}
                  />
                </Field>
              )}
              {value.amountOp !== 'gte' && (
                <Field>
                  <FieldLabel>{m['rules.form.amountMaxLabel']()}</FieldLabel>
                  <Input
                    disabled={disabled}
                    inputMode="numeric"
                    type="number"
                    value={value.amountMaxCents ?? ''}
                    onChange={(e) => {
                      if (e.target.value === '') {
                        onChange(omit(value, 'amountMaxCents'));
                      } else {
                        onChange({
                          ...value,
                          amountMaxCents: Number(e.target.value),
                        });
                      }
                    }}
                  />
                </Field>
              )}
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
