import { useNavigate, useSearch } from '@tanstack/react-router';
import { useMemo } from 'react';

import type { CategoryListItem } from '@/modules/categories/api/list-categories';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  CategoryForm,
  type CategoryFormValues,
} from '@/modules/categories/components/category-form';
import { useUpdateCategory } from '@/modules/categories/hooks/use-categories';
import { m } from '@/paraglide/messages';

type EditCategoryDialogProps = { categories: CategoryListItem[] };

export function EditCategoryDialog({ categories }: EditCategoryDialogProps) {
  const search = useSearch({ from: '/_app/categories' });
  const navigate = useNavigate();
  const mutation = useUpdateCategory();

  const editId = search.edit;
  const open = !!editId;

  const item = useMemo(
    () => categories.find((c) => c.id === editId),
    [categories, editId],
  );

  const defaultValues = useMemo<Partial<CategoryFormValues> | undefined>(() => {
    if (!item) return;
    return {
      name: item.name,
      ...(item.parentId ? { parentId: item.parentId } : {}),
      type: item.type,
    };
  }, [item]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      void navigate({ search: {}, to: '/categories' });
    }
  };

  const handleSubmit = (values: CategoryFormValues) => {
    if (!editId) return;
    mutation.mutate({
      id: editId,
      name: values.name,
      parentId: values.parentId ?? null,
      type: values.type,
    });
  };

  if (!open || !defaultValues) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{m['categories.edit.title']()}</DialogTitle>
          <DialogDescription>
            {m['categories.edit.description']()}
          </DialogDescription>
        </DialogHeader>
        <CategoryForm
          categories={categories}
          defaultValues={defaultValues}
          editId={editId}
          isSubmitting={mutation.isPending}
          onSubmit={handleSubmit}
        />
        <DialogFooter>
          <Button
            disabled={mutation.isPending}
            variant="outline"
            onClick={() => void navigate({ search: {}, to: '/categories' })}
          >
            {m['actions.cancel']()}
          </Button>
          <Button
            form="category-form"
            loading={mutation.isPending}
            type="submit"
          >
            {m['actions.save']()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
