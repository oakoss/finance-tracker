import { Icons } from '@/components/icons';
import { ConfirmDestructiveDialog } from '@/components/ui/confirm-destructive-dialog';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { useDeleteTransaction } from '@/modules/transactions/hooks/use-transactions';
import { m } from '@/paraglide/messages';

type DeleteTransactionActionProps = {
  transaction: { description: string; id: string };
};

export function DeleteTransactionAction({
  transaction,
}: DeleteTransactionActionProps) {
  const mutation = useDeleteTransaction();

  return (
    <ConfirmDestructiveDialog
      confirmPhrase={transaction.description}
      description={m['transactions.delete.description']()}
      loading={mutation.isPending}
      title={m['transactions.delete.title']()}
      trigger={
        <DropdownMenuItem
          className="text-destructive"
          onSelect={(e) => e.preventDefault()}
        >
          <Icons.Trash2 className="size-4" />
          {m['actions.delete']()}
        </DropdownMenuItem>
      }
      onConfirm={() => mutation.mutate({ id: transaction.id })}
    />
  );
}
