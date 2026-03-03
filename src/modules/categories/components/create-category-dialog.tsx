import { useSuspenseQuery } from '@tanstack/react-query';
import { useNavigate, useSearch } from '@tanstack/react-router';

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
import {
  categoryQueries,
  useCreateCategory,
} from '@/modules/categories/hooks/use-categories';
import { m } from '@/paraglide/messages';

export function CreateCategoryDialog() {
  const search = useSearch({ from: '/_app/categories' });
  const navigate = useNavigate();
  const mutation = useCreateCategory();
  const { data: categories } = useSuspenseQuery(categoryQueries.list());

  const open = search.modal === 'create';

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      void navigate({ search: {}, to: '/categories' });
    }
  };

  const handleSubmit = (values: CategoryFormValues) => {
    mutation.mutate({
      name: values.name,
      parentId: values.parentId || undefined,
      type: values.type,
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{m['categories.create.title']()}</DialogTitle>
          <DialogDescription>
            {m['categories.create.description']()}
          </DialogDescription>
        </DialogHeader>
        <CategoryForm
          categories={categories}
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
            {m['actions.create']()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
