import { useSuspenseQuery } from '@tanstack/react-query';
import { type } from 'arktype';
import { useMemo, useState } from 'react';

import type { MerchantRuleListItem } from '@/modules/rules/api/list-merchant-rules';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { accountQueries } from '@/modules/accounts/hooks/use-accounts';
import { categoryQueries } from '@/modules/categories/hooks/use-categories';
import { payeeQueries } from '@/modules/payees/hooks/use-payees';
import {
  DEFAULT_RULE_FORM_VALUES,
  RuleForm,
  type RuleFormValues,
} from '@/modules/rules/components/rule-form';
import {
  useCreateMerchantRule,
  useUpdateMerchantRule,
} from '@/modules/rules/hooks/use-merchant-rules';
import {
  matchPredicateSchema,
  ruleActionsSchema,
} from '@/modules/rules/models';
import { tagQueries } from '@/modules/transactions/hooks/use-transactions';
import { m } from '@/paraglide/messages';

type RuleEditorDialogProps = {
  existing: MerchantRuleListItem | null;
  onClose: () => void;
  open: boolean;
};

export function RuleEditorDialog(props: RuleEditorDialogProps) {
  return (
    <Dialog open={props.open} onOpenChange={(next) => !next && props.onClose()}>
      <DialogContent size="xl">
        {props.open && (
          <EditorBody
            key={props.existing?.id ?? 'create'}
            existing={props.existing}
            onClose={props.onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

type EditorBodyProps = {
  existing: MerchantRuleListItem | null;
  onClose: () => void;
};

function EditorBody({ existing, onClose }: EditorBodyProps) {
  const { data: categories } = useSuspenseQuery(categoryQueries.list());
  const { data: accounts } = useSuspenseQuery(accountQueries.list());
  const { data: payees } = useSuspenseQuery(payeeQueries.list());
  const { data: tags } = useSuspenseQuery(tagQueries.list());

  const create = useCreateMerchantRule();
  const update = useUpdateMerchantRule();
  const pending = create.isPending || update.isPending;

  const [values, setValues] = useState<RuleFormValues>(() =>
    existing ? toFormValues(existing) : DEFAULT_RULE_FORM_VALUES,
  );
  const submittable = useMemo(() => isSubmittable(values), [values]);

  const handleSubmit = () => {
    if (pending) return;
    if (existing) {
      update.mutate({
        actions: values.actions,
        id: existing.id,
        isActive: values.isActive,
        match: values.match,
        stage: values.stage,
      });
    } else {
      create.mutate({
        actions: values.actions,
        isActive: values.isActive,
        match: values.match,
        stage: values.stage,
      });
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {existing ? m['rules.edit.title']() : m['rules.create.title']()}
        </DialogTitle>
        <DialogDescription>
          {existing
            ? m['rules.edit.description']()
            : m['rules.create.description']()}
        </DialogDescription>
      </DialogHeader>
      <RuleForm
        accounts={accounts}
        categories={categories}
        disabled={pending}
        payees={payees}
        tags={tags}
        value={values}
        onChange={setValues}
      />
      <DialogFooter>
        <Button disabled={pending} variant="outline" onClick={onClose}>
          {m['actions.cancel']()}
        </Button>
        <Button
          disabled={!submittable}
          loading={pending}
          onClick={handleSubmit}
        >
          {existing ? m['actions.save']() : m['actions.create']()}
        </Button>
      </DialogFooter>
    </>
  );
}

function toFormValues(rule: MerchantRuleListItem): RuleFormValues {
  return {
    actions: rule.actions,
    isActive: rule.isActive,
    match: rule.match,
    stage: rule.stage,
  };
}

function isSubmittable(values: RuleFormValues): boolean {
  const match = matchPredicateSchema(values.match);
  if (match instanceof type.errors) return false;
  if (values.match.value.length === 0) return false;
  const actions = ruleActionsSchema(values.actions);
  if (actions instanceof type.errors) return false;
  // An "append tags" action with no tagIds is a no-op (engine skips it).
  // Replace with empty tagIds is a real mutation (strip all tags), so only
  // block the append variant.
  const hasMeaningfulWork = values.actions.some(
    (a) => a.kind !== 'setTags' || a.mode === 'replace' || a.tagIds.length > 0,
  );
  return hasMeaningfulWork;
}
