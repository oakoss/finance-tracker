import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';

import type { AccountListItem } from '@/modules/accounts/api/list-accounts';

import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { ConfirmDestructiveDialog } from '@/components/ui/confirm-destructive-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useDeleteAccount } from '@/modules/accounts/hooks/use-accounts';
import { m } from '@/paraglide/messages';

type AccountRowActionsProps = { row: AccountListItem };

export function AccountRowActions({ row }: AccountRowActionsProps) {
  const navigate = useNavigate();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const mutation = useDeleteAccount();

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button size="icon-sm" variant="ghost">
              <Icons.EllipsisVertical className="size-4" />
              <span className="sr-only">{m['accounts.actions']()}</span>
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() =>
              void navigate({
                search: { edit: row.account.id },
                to: '/accounts',
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
        confirmPhrase={row.account.name}
        description={m['accounts.delete.description']()}
        loading={mutation.isPending}
        open={deleteOpen}
        title={m['accounts.delete.title']()}
        onConfirm={() =>
          mutation.mutate(
            { id: row.account.id },
            { onSettled: () => setDeleteOpen(false) },
          )
        }
        onOpenChange={setDeleteOpen}
      />
    </>
  );
}
