import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';

import type { TransactionListItem } from '@/modules/transactions/api/list-transactions';

import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { ConfirmDestructiveDialog } from '@/components/ui/confirm-destructive-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useDeleteTransaction } from '@/modules/transactions/hooks/use-transactions';
import { m } from '@/paraglide/messages';

type TransactionRowActionsProps = {
  row: TransactionListItem;
};

export function TransactionRowActions({ row }: TransactionRowActionsProps) {
  const navigate = useNavigate();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const mutation = useDeleteTransaction();

  return (
    <>
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
          <DropdownMenuItem
            className="text-destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Icons.Trash2 className="size-4" />
            {m['actions.delete']()}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ConfirmDestructiveDialog
        confirmPhrase={row.description}
        description={m['transactions.delete.description']()}
        loading={mutation.isPending}
        open={deleteOpen}
        title={m['transactions.delete.title']()}
        onConfirm={() =>
          mutation.mutate(
            { id: row.id },
            { onSettled: () => setDeleteOpen(false) },
          )
        }
        onOpenChange={setDeleteOpen}
      />
    </>
  );
}
