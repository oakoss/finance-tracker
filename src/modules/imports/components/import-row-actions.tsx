import { Link } from '@tanstack/react-router';
import { useState } from 'react';

import type { ImportListItem } from '@/modules/imports/api/list-imports';

import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { ConfirmDestructiveDialog } from '@/components/ui/confirm-destructive-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useDeleteImport } from '@/modules/imports/hooks/use-imports';
import { m } from '@/paraglide/messages';

type ImportRowActionsProps = { row: ImportListItem };

export function ImportRowActions({ row }: ImportRowActionsProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const mutation = useDeleteImport();

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button size="icon-sm" variant="ghost">
              <Icons.EllipsisVertical className="size-4" />
              <span className="sr-only">{m['imports.actions']()}</span>
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            render={
              <Link params={{ importId: row.id }} to="/imports/$importId" />
            }
          >
            <Icons.Eye className="size-4" />
            {m['imports.detail.review']()}
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
        confirmPhrase={row.fileName ?? ''}
        description={m['imports.delete.description']({
          rowCount: String(row.rowCount ?? 0),
        })}
        loading={mutation.isPending}
        open={deleteOpen}
        title={m['imports.delete.title']()}
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
