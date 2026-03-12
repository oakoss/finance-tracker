import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { m } from '@/paraglide/messages';

export function BudgetsEmpty({
  onCreateClick,
  variant,
}: {
  onCreateClick: () => void;
  variant: 'noPeriods' | 'noCurrentPeriod';
}) {
  const isNoPeriods = variant === 'noPeriods';

  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="prominent">
          <Icons.ChartBar />
        </EmptyMedia>
        <EmptyTitle>
          {isNoPeriods
            ? m['budgets.empty.title']()
            : m['budgets.empty.noPeriod.title']()}
        </EmptyTitle>
        <EmptyDescription>
          {isNoPeriods
            ? m['budgets.empty.description']()
            : m['budgets.empty.noPeriod.description']()}
        </EmptyDescription>
      </EmptyHeader>
      <Button size="sm" onClick={onCreateClick}>
        <Icons.Plus className="size-4" />
        {m['budgets.createBudget']()}
      </Button>
    </Empty>
  );
}
