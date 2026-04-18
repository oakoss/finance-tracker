import type { RuleAction } from '@/modules/rules/models';

import { Icons } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { m } from '@/paraglide/messages';

function describe(action: RuleAction) {
  switch (action.kind) {
    case 'setCategory': {
      return {
        icon: <Icons.Tag />,
        label: m['rules.action.setCategory'](),
        variant: 'primary-light',
      } as const;
    }
    case 'setExcludedFromBudget': {
      return {
        icon: <Icons.CircleAlert />,
        label: m['rules.action.setExcludedFromBudget'](),
        variant: 'warning-light',
      } as const;
    }
    case 'setNote': {
      return {
        icon: <Icons.FileText />,
        label: m['rules.action.setNote'](),
        variant: 'secondary',
      } as const;
    }
    case 'setPayee': {
      return {
        icon: <Icons.User />,
        label: m['rules.action.setPayee'](),
        variant: 'info-light',
      } as const;
    }
    case 'setTags': {
      return {
        icon: <Icons.Tag />,
        label:
          action.mode === 'append'
            ? m['rules.action.setTags.append']()
            : m['rules.action.setTags.replace'](),
        variant: 'success-light',
      } as const;
    }
  }
}

export type ActionChipProps = { action: RuleAction; className?: string };

export function ActionChip({ action, className }: ActionChipProps) {
  const { icon, label, variant } = describe(action);
  return (
    <Badge className={className} size="sm" variant={variant}>
      {icon}
      {label}
    </Badge>
  );
}
