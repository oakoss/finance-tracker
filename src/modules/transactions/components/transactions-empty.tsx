import { useNavigate } from '@tanstack/react-router';

import { Icons } from '@/components/icons';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { MutationGate } from '@/modules/auth/components/mutation-gate';
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
      <MutationGate
        size="sm"
        onClick={() =>
          void navigate({ search: { modal: 'create' }, to: '/transactions' })
        }
      >
        <Icons.Plus className="size-4" />
        {m['transactions.addTransaction']()}
      </MutationGate>
    </Empty>
  );
}
