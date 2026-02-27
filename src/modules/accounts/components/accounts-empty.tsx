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
      <Button
        size="sm"
        onClick={() =>
          void navigate({ search: { modal: 'create' }, to: '/accounts' })
        }
      >
        <Icons.Plus className="size-4" />
        {m['accounts.addAccount']()}
      </Button>
    </Empty>
  );
}
