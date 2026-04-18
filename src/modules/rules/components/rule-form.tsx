import { useId } from 'react';

import type { AccountListItem } from '@/modules/accounts/api/list-accounts';
import type { CategoryListItem } from '@/modules/categories/api/list-categories';
import type { PayeeListItem } from '@/modules/payees/api/list-payees';
import type { MatchPredicate, RuleAction } from '@/modules/rules/models';
import type { TagListItem } from '@/modules/transactions/api/list-tags';

import { Field, FieldLabel } from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ActionsBuilder } from '@/modules/rules/components/actions-builder';
import { MatchBuilder } from '@/modules/rules/components/match-builder';
import { RulePreviewPanel } from '@/modules/rules/components/rule-preview-panel';
import { ruleStageEnum } from '@/modules/rules/db/schema';
import { m } from '@/paraglide/messages';

type Stage = (typeof ruleStageEnum.enumValues)[number];

const STAGE_LABEL: Record<Stage, () => string> = {
  default: () => m['rules.stage.default'](),
  post: () => m['rules.stage.post'](),
  pre: () => m['rules.stage.pre'](),
};

export type RuleFormValues = {
  actions: RuleAction[];
  isActive: boolean;
  match: MatchPredicate;
  stage: Stage;
};

export const DEFAULT_RULE_FORM_VALUES: RuleFormValues = {
  actions: [],
  isActive: true,
  match: { kind: 'contains', value: '' },
  stage: 'default',
};

type RuleFormProps = {
  accounts: AccountListItem[];
  categories: CategoryListItem[];
  disabled: boolean | undefined;
  onChange: (next: RuleFormValues) => void;
  payees: PayeeListItem[];
  tags: TagListItem[];
  value: RuleFormValues;
};

export function RuleForm({
  accounts,
  categories,
  disabled,
  onChange,
  payees,
  tags,
  value,
}: RuleFormProps) {
  const stageId = useId();
  const activeId = useId();
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <Field className="min-w-48">
          <FieldLabel htmlFor={stageId}>
            {m['rules.form.stageLabel']()}
          </FieldLabel>
          <Select
            disabled={disabled}
            value={value.stage}
            onValueChange={(v) => {
              if (
                v === null ||
                !(ruleStageEnum.enumValues as readonly string[]).includes(v)
              )
                return;
              onChange({ ...value, stage: v });
            }}
          >
            <SelectTrigger id={stageId}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ruleStageEnum.enumValues.map((stage) => (
                <SelectItem key={stage} value={stage}>
                  {STAGE_LABEL[stage]()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field orientation="horizontal">
          <FieldLabel htmlFor={activeId}>
            {m['rules.form.isActive']()}
          </FieldLabel>
          <Switch
            checked={value.isActive}
            disabled={disabled}
            id={activeId}
            onCheckedChange={(isActive) => onChange({ ...value, isActive })}
          />
        </Field>
      </div>

      <MatchBuilder
        accounts={accounts}
        disabled={disabled}
        value={value.match}
        onChange={(match) => onChange({ ...value, match })}
      />

      <div>
        <h3 className="mb-2 text-sm font-medium">
          {m['rules.form.actions.label']()}
        </h3>
        <ActionsBuilder
          actions={value.actions}
          disabled={disabled}
          lookup={{ accounts, categories, payees, tags }}
          onChange={(actions) => onChange({ ...value, actions })}
        />
      </div>

      <RulePreviewPanel match={value.match} />
    </div>
  );
}
