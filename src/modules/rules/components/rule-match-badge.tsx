import { useQuery } from '@tanstack/react-query';

import type { RuleAction } from '@/modules/rules/models';

import { Icons } from '@/components/icons';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { ActionChip } from '@/modules/rules/components/action-chip';
import { merchantRuleQueries } from '@/modules/rules/hooks/use-merchant-rules';
import { m } from '@/paraglide/messages';

type RuleMatchBadgeProps = { matchedRuleIds: string[] };

function actionKey(ruleId: string, action: RuleAction): string {
  // Explicit return type means a missing case fails to typecheck — adding
  // a RuleAction variant must extend this switch.
  switch (action.kind) {
    case 'setCategory': {
      return `${ruleId}-setCategory-${action.categoryId}`;
    }
    case 'setExcludedFromBudget': {
      return `${ruleId}-setExcludedFromBudget-${action.value}`;
    }
    case 'setNote': {
      return `${ruleId}-setNote`;
    }
    case 'setPayee': {
      return `${ruleId}-setPayee-${action.payeeId}`;
    }
    case 'setTags': {
      return `${ruleId}-setTags-${action.mode}`;
    }
  }
}

export function RuleMatchBadge({ matchedRuleIds }: RuleMatchBadgeProps) {
  // Non-suspending: the rules list is fetched on demand the first time a
  // visible row carries matchedRuleIds. Avoids prefetching the full rule
  // set on /transactions when most pages have no matches.
  const { data: rules } = useQuery(merchantRuleQueries.list());
  if (!rules) return null;
  const matched = matchedRuleIds
    .map((id) => rules.find((r) => r.id === id))
    .filter((r): r is NonNullable<typeof r> => r !== undefined);

  if (matched.length === 0) return null;

  return (
    <HoverCard>
      <HoverCardTrigger
        render={
          <button
            aria-label={m['transactions.matchedRule.label']()}
            className="inline-flex size-5 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
            type="button"
          >
            <Icons.Wand2 className="size-3.5" />
          </button>
        }
      />
      <HoverCardContent className="w-72">
        <p className="text-xs font-medium text-muted-foreground">
          {m['transactions.matchedRule.title']()}
        </p>
        <ul className="mt-2 flex flex-col gap-2">
          {matched.map((rule) => (
            <li key={rule.id} className="flex flex-col gap-1">
              <span className="text-sm font-medium">
                {rule.match.kind}: {rule.match.value}
              </span>
              <div className="flex flex-wrap gap-1">
                {rule.actions.map((action) => (
                  <ActionChip
                    key={actionKey(rule.id, action)}
                    action={action}
                  />
                ))}
              </div>
            </li>
          ))}
        </ul>
      </HoverCardContent>
    </HoverCard>
  );
}
