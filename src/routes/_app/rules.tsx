import { useSuspenseQuery } from '@tanstack/react-query';
import {
  createFileRoute,
  type ErrorComponentProps,
  useSearch,
} from '@tanstack/react-router';
import { type } from 'arktype';

import { RootErrorBoundary } from '@/components/errors/root-error-boundary';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { clientLog } from '@/lib/logging/client-logger';
import { MerchantRulesList } from '@/modules/rules/components/merchant-rules-list';
import { PayeeAliasesTab } from '@/modules/rules/components/payee-aliases-tab';
import { RulesEmpty } from '@/modules/rules/components/rules-empty';
import { RulesPageHeader } from '@/modules/rules/components/rules-page-header';
import { merchantRuleQueries } from '@/modules/rules/hooks/use-merchant-rules';
import { m } from '@/paraglide/messages';

const searchSchema = type({
  'applyFor?': 'string',
  'edit?': 'string',
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
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(merchantRuleQueries.list()),
});

function RulesPage() {
  const { data: rules } = useSuspenseQuery(merchantRuleQueries.list());
  const search = useSearch({ from: '/_app/rules' });
  const navigate = Route.useNavigate();
  const activeTab = search.tab ?? 'rules';

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
    </div>
  );
}

function RulesError(props: ErrorComponentProps) {
  return (
    <div className="flex flex-1 flex-col px-4 py-6 lg:px-6">
      <RootErrorBoundary {...props} />
    </div>
  );
}
