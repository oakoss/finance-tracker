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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SplitDialog } from '@/modules/transactions/components/split-dialog';
import {
  useDeleteTransaction,
  useUnsplitTransaction,
} from '@/modules/transactions/hooks/use-transactions';
import { m } from '@/paraglide/messages';

type TransactionRowActionsProps = { row: TransactionListItem };

export function TransactionRowActions({ row }: TransactionRowActionsProps) {
  const navigate = useNavigate();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [splitOpen, setSplitOpen] = useState(false);
  const deleteMutation = useDeleteTransaction();
  const unsplitMutation = useUnsplitTransaction();

  const isTransfer = !!row.transferId;

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
              void navigate({ search: { edit: row.id }, to: '/transactions' })
            }
          >
            <Icons.Settings2 className="size-4" />
            {m['actions.edit']()}
          </DropdownMenuItem>
          {!isTransfer && (
            <>
              <DropdownMenuSeparator />
              {row.isSplit ? (
                <>
                  <DropdownMenuItem onClick={() => setSplitOpen(true)}>
                    <Icons.Settings2 className="size-4" />
                    {m['transactions.split.editTitle']()}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => unsplitMutation.mutate({ id: row.id })}
                  >
                    <Icons.Undo2 className="size-4" />
                    {m['transactions.split.unsplit']()}
                  </DropdownMenuItem>
                </>
              ) : (
                <DropdownMenuItem onClick={() => setSplitOpen(true)}>
                  <Icons.Scissors className="size-4" />
                  {m['transactions.split.title']()}
                </DropdownMenuItem>
              )}
            </>
          )}
          <DropdownMenuSeparator />
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
        loading={deleteMutation.isPending}
        open={deleteOpen}
        title={m['transactions.delete.title']()}
        onConfirm={() =>
          deleteMutation.mutate(
            { id: row.id },
            { onSettled: () => setDeleteOpen(false) },
          )
        }
        onOpenChange={setDeleteOpen}
      />
      {splitOpen && (
        <SplitDialog
          open={splitOpen}
          transaction={row}
          onOpenChange={setSplitOpen}
        />
      )}
    </>
  );
}
