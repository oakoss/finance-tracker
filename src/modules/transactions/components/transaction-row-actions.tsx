import { useNavigate } from '@tanstack/react-router';

import type { TransactionListItem } from '@/modules/transactions/api/list-transactions';

import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DeleteTransactionAction } from '@/modules/transactions/components/delete-transaction-action';
import { m } from '@/paraglide/messages';

type TransactionRowActionsProps = {
  row: TransactionListItem;
};

export function TransactionRowActions({ row }: TransactionRowActionsProps) {
  const navigate = useNavigate();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button size="icon-sm" variant="ghost">
            <Icons.EllipsisVertical className="size-4" />
            <span className="sr-only">{m['transactions.actions']()}</span>
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() =>
            void navigate({
              search: { edit: row.id },
              to: '/transactions',
            })
          }
        >
          <Icons.Settings2 className="size-4" />
          {m['actions.edit']()}
        </DropdownMenuItem>
        <DeleteTransactionAction transaction={row} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
