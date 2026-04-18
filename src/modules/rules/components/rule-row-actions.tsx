import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';

import type { MerchantRuleListItem } from '@/modules/rules/api/list-merchant-rules';

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
import { formatMatchPreview } from '@/modules/rules/components/match-preview';
import { useDeleteMerchantRule } from '@/modules/rules/hooks/use-merchant-rules';
import { m } from '@/paraglide/messages';

type RuleRowActionsProps = { row: MerchantRuleListItem };

export function RuleRowActions({ row }: RuleRowActionsProps) {
  const navigate = useNavigate();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const mutation = useDeleteMerchantRule();
  const confirmPhrase = formatMatchPreview(row.match);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button size="icon-sm" variant="ghost">
              <Icons.EllipsisVertical className="size-4" />
              <span className="sr-only">{m['rules.actions.label']()}</span>
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() =>
              void navigate({ search: { edit: row.id }, to: '/rules' })
            }
          >
            <Icons.Settings2 className="size-4" />
            {m['rules.action.edit']()}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() =>
              void navigate({
                search: { applyFor: row.id, modal: 'apply' },
                to: '/rules',
              })
            }
          >
            <Icons.Play className="size-4" />
            {m['rules.action.apply']()}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Icons.Trash2 className="size-4" />
            {m['rules.action.delete']()}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ConfirmDestructiveDialog
        confirmPhrase={confirmPhrase}
        description={m['rules.delete.description']()}
        loading={mutation.isPending}
        open={deleteOpen}
        title={m['rules.delete.title']()}
        onConfirm={() =>
          mutation.mutate(
            { id: row.id },
            { onSuccess: () => setDeleteOpen(false) },
          )
        }
        onOpenChange={setDeleteOpen}
      />
    </>
  );
}
