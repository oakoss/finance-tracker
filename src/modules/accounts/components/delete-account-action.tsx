import { Icons } from '@/components/icons';
import { ConfirmDestructiveDialog } from '@/components/ui/confirm-destructive-dialog';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { useDeleteAccount } from '@/modules/accounts/hooks/use-accounts';
import { m } from '@/paraglide/messages';

type DeleteAccountActionProps = {
  account: { id: string; name: string };
};

export function DeleteAccountAction({ account }: DeleteAccountActionProps) {
  const mutation = useDeleteAccount();

  return (
    <ConfirmDestructiveDialog
      confirmPhrase={account.name}
      description={m['accounts.delete.description']()}
      loading={mutation.isPending}
      title={m['accounts.delete.title']()}
      trigger={
        <DropdownMenuItem
          className="text-destructive"
          onSelect={(e) => e.preventDefault()}
        >
          <Icons.Trash2 className="size-4" />
          {m['actions.delete']()}
        </DropdownMenuItem>
      }
      onConfirm={() => mutation.mutate({ id: account.id })}
    />
  );
}
