import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { useState } from 'react';

import type { MerchantRuleListItem } from '@/modules/rules/api/list-merchant-rules';
import type { ruleStageEnum } from '@/modules/rules/db/schema';

import { Icons } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Sortable } from '@/components/ui/sortable';
import { cn } from '@/lib/utils';
import { RuleRow } from '@/modules/rules/components/rule-row';
import { useReorderMerchantRules } from '@/modules/rules/hooks/use-merchant-rules';
import { m } from '@/paraglide/messages';

type Stage = (typeof ruleStageEnum.enumValues)[number];

const STAGE_LABEL = {
  default: () => m['rules.stage.default'](),
  post: () => m['rules.stage.post'](),
  pre: () => m['rules.stage.pre'](),
} satisfies Record<Stage, () => string>;

type StageSectionProps = { rows: MerchantRuleListItem[]; stage: Stage };

export function StageSection({ rows, stage }: StageSectionProps) {
  const [open, setOpen] = useState(true);
  const reorder = useReorderMerchantRules();

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-muted/60">
        <Icons.ChevronRight
          className={cn('size-4 transition-transform', open && 'rotate-90')}
        />
        <span className="text-sm font-medium">{STAGE_LABEL[stage]()}</span>
        <Badge size="sm" variant="outline">
          {rows.length}
        </Badge>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2">
        {rows.length === 0 ? (
          <div className="rounded-md border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
            {m['rules.stage.empty']()}
          </div>
        ) : (
          <Sortable
            className="space-y-1"
            getItemValue={(row) => row.id}
            modifiers={[restrictToVerticalAxis]}
            value={rows}
            onMove={({ activeIndex, overIndex }) => {
              if (reorder.isPending) return;
              const next = [...rows];
              const [moved] = next.splice(activeIndex, 1);
              if (!moved) return;
              next.splice(overIndex, 0, moved);
              reorder.mutate({ orderedIds: next.map((row) => row.id), stage });
            }}
            onValueChange={() => {
              /* empty */
            }}
          >
            {rows.map((row) => (
              <RuleRow key={row.id} row={row} />
            ))}
          </Sortable>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
