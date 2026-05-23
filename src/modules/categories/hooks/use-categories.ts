import { queryOptions } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';

import type {
  CreateCategoryInput,
  DeleteCategoryInput,
  UpdateCategoryInput,
} from '@/modules/categories/validators';

import { useAnalytics } from '@/hooks/use-analytics';
import { useResourceMutation } from '@/hooks/use-resource-mutation';
import { createCategory } from '@/modules/categories/api/create-category';
import { deleteCategory } from '@/modules/categories/api/delete-category';
import { listCategories } from '@/modules/categories/api/list-categories';
import { updateCategory } from '@/modules/categories/api/update-category';
import { m } from '@/paraglide/messages';

export const categoryQueries = {
  all: () => ['categories'] as const,
  list: () =>
    queryOptions({
      queryFn: () => listCategories(),
      queryKey: [...categoryQueries.all(), 'list'],
    }),
};

export function useCreateCategory() {
  const navigate = useNavigate();
  const { capture } = useAnalytics();

  return useResourceMutation({
    errorMessage: m['categories.toast.createError'],
    invalidate: [categoryQueries.all()],
    mutationFn: (data: CreateCategoryInput) => createCategory({ data }),
    mutationKey: ['category', 'create'],
    onSuccess: (_data, variables) => {
      void navigate({ search: {}, to: '/categories' });
      capture('category_created', {
        has_parent: !!variables.parentId,
        type: variables.type,
      });
    },
    successMessage: m['categories.toast.createSuccess'],
  });
}

export function useUpdateCategory() {
  const navigate = useNavigate();
  const { capture } = useAnalytics();

  return useResourceMutation({
    errorMessage: m['categories.toast.updateError'],
    invalidate: [categoryQueries.all()],
    mutationFn: (data: UpdateCategoryInput) => updateCategory({ data }),
    mutationKey: ['category', 'update'],
    onSuccess: () => {
      void navigate({ search: {}, to: '/categories' });
      capture('category_updated');
    },
    successMessage: m['categories.toast.updateSuccess'],
  });
}

export function useDeleteCategory() {
  const { capture } = useAnalytics();

  return useResourceMutation({
    errorMessage: m['categories.toast.deleteError'],
    invalidate: [categoryQueries.all()],
    mutationFn: (data: DeleteCategoryInput) => deleteCategory({ data }),
    mutationKey: ['category', 'delete'],
    onSuccess: () => {
      capture('category_deleted');
    },
    successMessage: m['categories.toast.deleteSuccess'],
  });
}
