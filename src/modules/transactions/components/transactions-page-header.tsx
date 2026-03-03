import { useNavigate } from '@tanstack/react-router';

import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { m } from '@/paraglide/messages';

export function TransactionsPageHeader() {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-between">
      <h1 className="text-2xl font-semibold tracking-tight">
        {m['transactions.title']()}
      </h1>
      <Button
        size="sm"
        onClick={() =>
          void navigate({ search: { modal: 'create' }, to: '/transactions' })
        }
      >
        <Icons.Plus className="size-4" />
        {m['transactions.addTransaction']()}
      </Button>
    </div>
  );
}
