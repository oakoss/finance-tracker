import { Badge, type BadgeProps } from '@/components/ui/badge';
import { m } from '@/paraglide/messages';

const CONFIG: Record<
  string,
  { label: () => string; variant: BadgeProps['variant'] }
> = {
  cash: { label: () => m['accounts.type.cash'](), variant: 'secondary' },
  checking: { label: () => m['accounts.type.checking'](), variant: 'info' },
  credit_card: {
    label: () => m['accounts.type.credit_card'](),
    variant: 'warning',
  },
  investment: {
    label: () => m['accounts.type.investment'](),
    variant: 'success',
  },
  loan: { label: () => m['accounts.type.loan'](), variant: 'destructive' },
  other: { label: () => m['accounts.type.other'](), variant: 'outline' },
  savings: {
    label: () => m['accounts.type.savings'](),
    variant: 'primary-light',
  },
};

export function AccountTypeBadge({ type }: { type: string }) {
  const cfg = CONFIG[type];
  return (
    <Badge variant={cfg?.variant ?? 'outline'}>{cfg?.label() ?? type}</Badge>
  );
}
