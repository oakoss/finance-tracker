import type { MerchantRuleListItem } from '@/modules/rules/api/list-merchant-rules';
import type { RuleAction } from '@/modules/rules/models';

import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { SortableItem, SortableItemHandle } from '@/components/ui/sortable';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { ActionChip } from '@/modules/rules/components/action-chip';
import {
  formatMatchPreview,
  MatchPreview,
} from '@/modules/rules/components/match-preview';
import { RuleRowActions } from '@/modules/rules/components/rule-row-actions';
import { useToggleMerchantRule } from '@/modules/rules/hooks/use-merchant-rules';
import { m } from '@/paraglide/messages';

type RuleRowProps = { row: MerchantRuleListItem };

function keyedActions(
  actions: RuleAction[],
): { action: RuleAction; key: string }[] {
  const seen = new Map<string, number>();
  return actions.map((action) => {
    const base = JSON.stringify(action);
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    return { action, key: `${base}#${count}` };
  });
}

export function RuleRow({ row }: RuleRowProps) {
  const toggle = useToggleMerchantRule();
  const chips = keyedActions(row.actions);

  return (
    <SortableItem
      aria-label={formatMatchPreview(row.match)}
      className={cn(
        'flex items-center gap-3 rounded-md border bg-background px-3 py-2',
        !row.isActive && 'opacity-60',
      )}
      role="listitem"
      value={row.id}
    >
      <SortableItemHandle
        render={
          <Button
            aria-label={m['rules.row.dragHandle']()}
            className="text-muted-foreground"
            size="icon-sm"
            variant="ghost"
          >
            <Icons.GripVertical />
          </Button>
        }
      />
      <MatchPreview className="min-w-0 flex-1" match={row.match} />
      <div className="hidden flex-wrap items-center gap-1 sm:flex">
        {chips.map(({ action, key }) => (
          <ActionChip key={key} action={action} />
        ))}
      </div>
      <Switch
        aria-label={m['rules.form.isActive']()}
        checked={row.isActive}
        disabled={toggle.isPending}
        onCheckedChange={() => toggle.mutate({ id: row.id })}
      />
      <RuleRowActions row={row} />
    </SortableItem>
  );
}
