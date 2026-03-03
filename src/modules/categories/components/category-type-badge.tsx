import { Badge, type BadgeProps } from '@/components/ui/badge';
import { m } from '@/paraglide/messages';

const CONFIG: Record<
  string,
  { label: () => string; variant: BadgeProps['variant'] }
> = {
  expense: {
    label: () => m['categories.type.expense'](),
    variant: 'warning',
  },
  income: {
    label: () => m['categories.type.income'](),
    variant: 'success',
  },
  transfer: {
    label: () => m['categories.type.transfer'](),
    variant: 'info',
  },
};

export function CategoryTypeBadge({ type }: { type: string }) {
  const cfg = CONFIG[type];
  return (
    <Badge variant={cfg?.variant ?? 'outline'}>{cfg?.label() ?? type}</Badge>
  );
}
