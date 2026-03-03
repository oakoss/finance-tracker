import { useNavigate } from '@tanstack/react-router';

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

export function TransactionsEmpty() {
  const navigate = useNavigate();

  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="prominent">
          <Icons.ArrowLeftRight />
        </EmptyMedia>
        <EmptyTitle>{m['transactions.empty.title']()}</EmptyTitle>
        <EmptyDescription>
          {m['transactions.empty.description']()}
        </EmptyDescription>
      </EmptyHeader>
      <Button
        size="sm"
        onClick={() =>
          void navigate({ search: { modal: 'create' }, to: '/transactions' })
        }
      >
        <Icons.Plus className="size-4" />
        {m['transactions.addTransaction']()}
      </Button>
    </Empty>
  );
}
