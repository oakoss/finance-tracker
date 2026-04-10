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

export function AccountsEmpty() {
  const navigate = useNavigate();

  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="prominent">
          <Icons.Wallet />
        </EmptyMedia>
        <EmptyTitle>{m['accounts.empty.title']()}</EmptyTitle>
        <EmptyDescription>{m['accounts.empty.description']()}</EmptyDescription>
      </EmptyHeader>
      <MutationGate
        size="sm"
        onClick={() =>
          void navigate({ search: { modal: 'create' }, to: '/accounts' })
        }
      >
        <Icons.Plus className="size-4" />
        {m['accounts.addAccount']()}
      </MutationGate>
    </Empty>
  );
}
