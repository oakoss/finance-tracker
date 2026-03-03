import { Icons } from '@/components/icons';
import { ConfirmDestructiveDialog } from '@/components/ui/confirm-destructive-dialog';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { useDeleteCategory } from '@/modules/categories/hooks/use-categories';
import { m } from '@/paraglide/messages';

type DeleteCategoryActionProps = {
  category: { id: string; name: string };
};

export function DeleteCategoryAction({ category }: DeleteCategoryActionProps) {
  const mutation = useDeleteCategory();

  return (
    <ConfirmDestructiveDialog
      confirmPhrase={category.name}
      description={m['categories.delete.description']()}
      loading={mutation.isPending}
      title={m['categories.delete.title']()}
      trigger={
        <DropdownMenuItem
          className="text-destructive"
          onSelect={(e) => e.preventDefault()}
        >
          <Icons.Trash2 className="size-4" />
          {m['actions.delete']()}
        </DropdownMenuItem>
      }
      onConfirm={() => mutation.mutate({ id: category.id })}
    />
  );
}
