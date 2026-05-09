import { useSuspenseQuery } from '@tanstack/react-query';
import {
  createFileRoute,
  type ErrorComponentProps,
  useSearch,
} from '@tanstack/react-router';
import { type } from 'arktype';
import { useCallback, useEffect } from 'react';
import { toast } from 'sonner';

import { RootErrorBoundary } from '@/components/errors/root-error-boundary';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { clientLog } from '@/lib/logging/client-logger';
import { hashId } from '@/lib/logging/hash';
import { omit } from '@/lib/utils';
import { accountQueries } from '@/modules/accounts/hooks/use-accounts';
import { categoryQueries } from '@/modules/categories/hooks/use-categories';
import { payeeQueries } from '@/modules/payees/hooks/use-payees';
import { ApplyRuleDialog } from '@/modules/rules/components/apply-rule-dialog';
import { MerchantRulesList } from '@/modules/rules/components/merchant-rules-list';
import { PayeeAliasesTab } from '@/modules/rules/components/payee-aliases-tab';
import { RuleEditorDialog } from '@/modules/rules/components/rule-editor-dialog';
import { RulesEmpty } from '@/modules/rules/components/rules-empty';
import { RulesPageHeader } from '@/modules/rules/components/rules-page-header';
import { merchantRuleQueries } from '@/modules/rules/hooks/use-merchant-rules';
import { transactionToRuleSeed } from '@/modules/rules/lib/transaction-to-rule-seed';
import {
  tagQueries,
  transactionQueries,
} from '@/modules/transactions/hooks/use-transactions';
import { m } from '@/paraglide/messages';

const searchSchema = type({
  'applyFor?': 'string',
  'edit?': 'string',
  'fromTransaction?': 'string',
  'modal?': type.enumerated('create', 'apply'),
  'tab?': type.enumerated('rules', 'aliases'),
}).narrow((data, ctx) => {
  if (data.edit !== undefined && data.applyFor !== undefined) {
    ctx.mustBe('only one of edit or applyFor');
    return false;
  }
  if (data.modal === 'apply' && data.applyFor === undefined) {
    ctx.mustBe('applyFor when modal is "apply"');
    return false;
  }
  if (data.applyFor !== undefined && data.modal !== 'apply') {
    ctx.mustBe("modal='apply' when applyFor is set");
    return false;
  }
  if (data.modal === 'create' && data.edit !== undefined) {
    ctx.mustBe("no edit when modal is 'create'");
    return false;
  }
  if (data.fromTransaction !== undefined && data.modal !== 'create') {
    ctx.mustBe("modal='create' when fromTransaction is set");
    return false;
  }
  return true;
});

export const Route = createFileRoute('/_app/rules')({
  component: RulesPage,
  errorComponent: RulesError,
  validateSearch: (raw) => {
    const result = searchSchema(raw);
    if (result instanceof type.errors) {
      clientLog.warn({
        action: 'rules.search.invalid',
        outcome: { reason: result.summary, success: false },
      });
      return {};
    }
    return result;
  },
  loaderDeps: ({ search }) => ({ fromTransaction: search.fromTransaction }),
  loader: async ({ context, deps }) => {
    const tasks: Promise<unknown>[] = [
      context.queryClient.ensureQueryData(merchantRuleQueries.list()),
      context.queryClient.ensureQueryData(categoryQueries.list()),
      context.queryClient.ensureQueryData(accountQueries.list()),
      context.queryClient.ensureQueryData(payeeQueries.list()),
      context.queryClient.ensureQueryData(tagQueries.list()),
    ];
    // Only the deep-link "create rule from transaction" flow needs a
    // transaction; fetch a single row by id rather than the full list.
    if (deps.fromTransaction !== undefined) {
      tasks.push(
        context.queryClient.ensureQueryData(
          transactionQueries.byId(deps.fromTransaction),
        ),
      );
    }
    await Promise.all(tasks);
  },
});

function RulesPage() {
  const { data: rules } = useSuspenseQuery(merchantRuleQueries.list());
  const search = useSearch({ from: '/_app/rules' });
  const navigate = Route.useNavigate();
  const activeTab = search.tab ?? 'rules';

  const editingRule = search.edit
    ? (rules.find((r) => r.id === search.edit) ?? null)
    : null;
  const applyRule = search.applyFor
    ? (rules.find((r) => r.id === search.applyFor) ?? null)
    : null;
  // A stale edit id would otherwise silently render as a create dialog.
  const editorOpen =
    search.modal === 'create' ||
    (search.edit !== undefined && editingRule !== null);
  const applyOpen = search.modal === 'apply' && applyRule !== null;

  const closeEditor = useCallback(
    () =>
      void navigate({
        search: (prev) => omit(prev, 'edit', 'fromTransaction', 'modal'),
        to: '/rules',
      }),
    [navigate],
  );
  const closeApply = useCallback(
    () =>
      void navigate({
        search: (prev) => omit(prev, 'applyFor', 'modal'),
        to: '/rules',
      }),
    [navigate],
  );

  useEffect(() => {
    if (search.edit && !editingRule) {
      clientLog.warn({
        action: 'rules.edit.notFound',
        outcome: { ruleIdHash: hashId(search.edit), success: false },
      });
      toast.info(m['rules.edit.notFound']());
      closeEditor();
    }
  }, [search.edit, editingRule, closeEditor]);

  useEffect(() => {
    if (search.applyFor && !applyRule) {
      clientLog.warn({
        action: 'rules.apply.notFound',
        outcome: { ruleIdHash: hashId(search.applyFor), success: false },
      });
      toast.info(m['rules.apply.notFound']());
      closeApply();
    }
  }, [search.applyFor, applyRule, closeApply]);

  return (
    <div className="flex flex-1 flex-col gap-6 px-4 py-6 lg:px-6">
      <RulesPageHeader />
      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          const next = value === 'rules' ? 'rules' : 'aliases';
          void navigate({
            search: (prev) => ({ ...prev, tab: next }),
            to: '/rules',
          });
        }}
      >
        <TabsList>
          <TabsTrigger value="rules">{m['rules.title']()}</TabsTrigger>
          <TabsTrigger value="aliases">
            {m['rules.aliases.title']()}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="rules">
          {rules.length === 0 ? (
            <RulesEmpty />
          ) : (
            <MerchantRulesList rules={rules} />
          )}
        </TabsContent>
        <TabsContent value="aliases">
          <PayeeAliasesTab />
        </TabsContent>
      </Tabs>
      {search.fromTransaction === undefined ? (
        <RuleEditorDialog
          existing={editingRule}
          open={editorOpen}
          seed={null}
          onClose={closeEditor}
        />
      ) : (
        <SeededRuleEditorDialog
          open={editorOpen}
          transactionId={search.fromTransaction}
          onClose={closeEditor}
        />
      )}
      <ApplyRuleDialog
        open={applyOpen}
        ruleId={applyRule?.id ?? null}
        onClose={closeApply}
      />
    </div>
  );
}

type SeededRuleEditorDialogProps = {
  onClose: () => void;
  open: boolean;
  transactionId: string;
};

function SeededRuleEditorDialog({
  onClose,
  open,
  transactionId,
}: SeededRuleEditorDialogProps) {
  const { data: transaction } = useSuspenseQuery(
    transactionQueries.byId(transactionId),
  );
  const seed = transaction ? transactionToRuleSeed(transaction) : null;

  useEffect(() => {
    if (transaction !== null) return;
    clientLog.warn({
      action: 'rules.fromTransaction.notFound',
      outcome: { success: false, transactionIdHash: hashId(transactionId) },
    });
    toast.info(m['rules.fromTransaction.notFound']());
    onClose();
  }, [transaction, transactionId, onClose]);

  return (
    <RuleEditorDialog
      existing={null}
      open={open}
      seed={seed}
      seedKey={`from-${transactionId}`}
      onClose={onClose}
    />
  );
}

function RulesError(props: ErrorComponentProps) {
  return (
    <div className="flex flex-1 flex-col px-4 py-6 lg:px-6">
      <RootErrorBoundary {...props} />
    </div>
  );
}
