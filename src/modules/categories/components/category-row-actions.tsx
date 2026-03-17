import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';

import type { CategoryListItem } from '@/modules/categories/api/list-categories';

import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { ConfirmDestructiveDialog } from '@/components/ui/confirm-destructive-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useDeleteCategory } from '@/modules/categories/hooks/use-categories';
import { m } from '@/paraglide/messages';

type CategoryRowActionsProps = { row: CategoryListItem };

export function CategoryRowActions({ row }: CategoryRowActionsProps) {
  const navigate = useNavigate();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const mutation = useDeleteCategory();

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button size="icon-sm" variant="ghost">
              <Icons.EllipsisVertical className="size-4" />
              <span className="sr-only">{m['categories.actions']()}</span>
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() =>
              void navigate({ search: { edit: row.id }, to: '/categories' })
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
        confirmPhrase={row.name}
        description={m['categories.delete.description']()}
        loading={mutation.isPending}
        open={deleteOpen}
        title={m['categories.delete.title']()}
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
