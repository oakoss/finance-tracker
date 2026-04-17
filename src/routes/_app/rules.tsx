import { useSuspenseQuery } from '@tanstack/react-query';
import {
  createFileRoute,
  type ErrorComponentProps,
  useNavigate,
  useSearch,
} from '@tanstack/react-router';
import { type } from 'arktype';

import { RootErrorBoundary } from '@/components/errors/root-error-boundary';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { clientLog } from '@/lib/logging/client-logger';
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
  const navigate = useNavigate();
  const activeTab = search.tab ?? 'rules';

  return (
    <div className="flex flex-1 flex-col gap-6 px-4 py-6 lg:px-6">
      <RulesPageHeader />
      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          const next = value === 'rules' ? 'rules' : 'aliases';
          void navigate({ search: { tab: next }, to: '/rules' });
        }}
      >
        <TabsList>
          <TabsTrigger value="rules">{m['rules.title']()}</TabsTrigger>
          <TabsTrigger value="aliases">
            {m['rules.aliases.title']()}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="rules">
          {rules.length === 0 ? <RulesEmpty /> : <RulesListPlaceholder />}
        </TabsContent>
        <TabsContent value="aliases">
          <PayeeAliasesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function RulesListPlaceholder() {
  return (
    <div className="text-sm text-muted-foreground">
      Rule list coming in the next checkpoint.
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
