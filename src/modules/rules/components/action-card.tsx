import { useId } from 'react';

import type { AccountListItem } from '@/modules/accounts/api/list-accounts';
import type { CategoryListItem } from '@/modules/categories/api/list-categories';
import type { PayeeListItem } from '@/modules/payees/api/list-payees';
import type { RuleAction } from '@/modules/rules/models';
import type { TagListItem } from '@/modules/transactions/api/list-tags';

import { Icons } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { m } from '@/paraglide/messages';

export type ActionCardLookup = {
  accounts: AccountListItem[];
  categories: CategoryListItem[];
  payees: PayeeListItem[];
  tags: TagListItem[];
};

type ActionCardProps = {
  action: RuleAction;
  disabled: boolean | undefined;
  lookup: ActionCardLookup;
  onChange: (next: RuleAction) => void;
  onRemove: () => void;
};

export function ActionCard({
  action,
  disabled,
  lookup,
  onChange,
  onRemove,
}: ActionCardProps) {
  return (
    <div
      className="flex flex-col gap-3 rounded-md border bg-muted/30 p-3"
      data-kind={action.kind}
    >
      <div className="flex items-center justify-between gap-2">
        <Badge size="sm" variant="outline">
          {actionTitle(action)}
        </Badge>
        <Button
          aria-label={m['rules.form.actions.remove']()}
          disabled={disabled}
          size="icon-sm"
          variant="ghost"
          onClick={onRemove}
        >
          <Icons.X />
        </Button>
      </div>
      <ActionFields
        action={action}
        disabled={disabled}
        lookup={lookup}
        onChange={onChange}
      />
    </div>
  );
}

function actionTitle(action: RuleAction): string {
  switch (action.kind) {
    case 'setCategory': {
      return m['rules.action.setCategory']();
    }
    case 'setExcludedFromBudget': {
      return m['rules.action.setExcludedFromBudget']();
    }
    case 'setNote': {
      return m['rules.action.setNote']();
    }
    case 'setPayee': {
      return m['rules.action.setPayee']();
    }
    case 'setTags': {
      return action.mode === 'append'
        ? m['rules.action.setTags.append']()
        : m['rules.action.setTags.replace']();
    }
  }
}

type ActionFieldsProps = {
  action: RuleAction;
  disabled: boolean | undefined;
  lookup: ActionCardLookup;
  onChange: (next: RuleAction) => void;
};

function ActionFields({
  action,
  disabled,
  lookup,
  onChange,
}: ActionFieldsProps) {
  const fieldId = useId();
  switch (action.kind) {
    case 'setCategory': {
      return (
        <Field>
          <FieldLabel htmlFor={fieldId}>
            {m['rules.action.setCategory']()}
          </FieldLabel>
          <Select
            disabled={disabled}
            value={action.categoryId}
            onValueChange={(v) => {
              if (v === null || v.length === 0) return;
              onChange({ categoryId: v, kind: 'setCategory' });
            }}
          >
            <SelectTrigger id={fieldId}>
              <SelectValue
                placeholder={m['rules.form.actions.placeholderCategory']()}
              />
            </SelectTrigger>
            <SelectContent>
              {lookup.categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      );
    }
    case 'setPayee': {
      return (
        <Field>
          <FieldLabel htmlFor={fieldId}>
            {m['rules.action.setPayee']()}
          </FieldLabel>
          <Select
            disabled={disabled}
            value={action.payeeId}
            onValueChange={(v) => {
              if (v === null || v.length === 0) return;
              onChange({ kind: 'setPayee', payeeId: v });
            }}
          >
            <SelectTrigger id={fieldId}>
              <SelectValue
                placeholder={m['rules.form.actions.placeholderPayee']()}
              />
            </SelectTrigger>
            <SelectContent>
              {lookup.payees.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      );
    }
    case 'setNote': {
      return (
        <Field>
          <FieldLabel htmlFor={fieldId}>
            {m['rules.form.actions.noteLabel']()}
          </FieldLabel>
          <Input
            disabled={disabled}
            id={fieldId}
            placeholder={m['rules.form.actions.placeholderNote']()}
            value={action.value}
            onChange={(e) =>
              onChange({ kind: 'setNote', value: e.target.value })
            }
          />
        </Field>
      );
    }
    case 'setTags': {
      return (
        <TagsFields
          action={action}
          disabled={disabled}
          tags={lookup.tags}
          onChange={onChange}
        />
      );
    }
    case 'setExcludedFromBudget': {
      return null;
    }
  }
}

type TagsFieldsProps = {
  action: Extract<RuleAction, { kind: 'setTags' }>;
  disabled: boolean | undefined;
  onChange: (next: RuleAction) => void;
  tags: TagListItem[];
};

function TagsFields({ action, disabled, onChange, tags }: TagsFieldsProps) {
  const modeId = useId();
  const pickerId = useId();
  const selected = new Set(action.tagIds);
  const available = tags.filter((t) => !selected.has(t.id));

  return (
    <div className="flex flex-col gap-3">
      <Field>
        <FieldLabel htmlFor={modeId}>
          {m['rules.form.actions.tagsModeLabel']()}
        </FieldLabel>
        <Select
          disabled={disabled}
          value={action.mode}
          onValueChange={(v) => {
            if (v !== 'append' && v !== 'replace') return;
            onChange({ ...action, mode: v });
          }}
        >
          <SelectTrigger id={modeId}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="append">
              {m['rules.form.actions.tagsModeAppend']()}
            </SelectItem>
            <SelectItem value="replace">
              {m['rules.form.actions.tagsModeReplace']()}
            </SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <Field>
        <FieldLabel htmlFor={pickerId}>
          {m['rules.form.actions.tagsLabel']()}
        </FieldLabel>
        {action.tagIds.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {m['rules.form.actions.tagsEmpty']()}
          </p>
        ) : (
          <div className="flex flex-wrap gap-1">
            {action.tagIds.map((id) => {
              const tag = tags.find((t) => t.id === id);
              const name = tag?.name ?? id;
              return (
                <Badge key={id} size="sm" variant="secondary">
                  {name}
                  <Button
                    aria-label={m['rules.form.actions.removeTag']({ name })}
                    className="ml-1 size-4 p-0"
                    disabled={disabled}
                    size="icon-sm"
                    variant="ghost"
                    onClick={() =>
                      onChange({
                        ...action,
                        tagIds: action.tagIds.filter((x) => x !== id),
                      })
                    }
                  >
                    <Icons.X />
                  </Button>
                </Badge>
              );
            })}
          </div>
        )}
        <Select
          disabled={disabled ?? available.length === 0}
          value=""
          onValueChange={(v) => {
            if (v === null || v.length === 0) return;
            onChange({ ...action, tagIds: [...action.tagIds, v] });
          }}
        >
          <SelectTrigger id={pickerId}>
            <SelectValue
              placeholder={m['rules.form.actions.placeholderTag']()}
            />
          </SelectTrigger>
          <SelectContent>
            {available.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
    </div>
  );
}
