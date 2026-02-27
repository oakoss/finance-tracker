import { useNavigate } from '@tanstack/react-router';

import type { AccountListItem } from '@/modules/accounts/api/list-accounts';

import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DeleteAccountAction } from '@/modules/accounts/components/delete-account-action';
import { m } from '@/paraglide/messages';

type AccountRowActionsProps = {
  row: AccountListItem;
};

export function AccountRowActions({ row }: AccountRowActionsProps) {
  const navigate = useNavigate();

  return (
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
        <DeleteAccountAction account={row.account} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
