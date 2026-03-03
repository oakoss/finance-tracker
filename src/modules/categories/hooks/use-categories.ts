import {
  queryOptions,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { useNavigate, useRouter } from '@tanstack/react-router';
import { toast } from 'sonner';

import type {
  CreateCategoryInput,
  DeleteCategoryInput,
  UpdateCategoryInput,
} from '@/modules/categories/types';

import { clientLog } from '@/lib/logging/client-logger';
import { parseError } from '@/lib/logging/evlog';
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
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const router = useRouter();

  return useMutation({
    mutationFn: (data: CreateCategoryInput) => createCategory({ data }),
    onError: (error) => {
      const parsed = parseError(error);
      clientLog.error({ action: 'category.create.failed', error });
      toast.error(m['categories.toast.createError'](), {
        description: parsed.fix ?? parsed.why ?? m['auth.error.unexpected'](),
      });
    },
    onSuccess: () => {
      toast.success(m['categories.toast.createSuccess']());
      void navigate({ search: {}, to: '/categories' });
      void queryClient.invalidateQueries({
        queryKey: categoryQueries.all(),
      });
      void router.invalidate();
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const router = useRouter();

  return useMutation({
    mutationFn: (data: UpdateCategoryInput) => updateCategory({ data }),
    onError: (error) => {
      const parsed = parseError(error);
      clientLog.error({ action: 'category.update.failed', error });
      toast.error(m['categories.toast.updateError'](), {
        description: parsed.fix ?? parsed.why ?? m['auth.error.unexpected'](),
      });
    },
    onSuccess: () => {
      toast.success(m['categories.toast.updateSuccess']());
      void navigate({ search: {}, to: '/categories' });
      void queryClient.invalidateQueries({
        queryKey: categoryQueries.all(),
      });
      void router.invalidate();
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (data: DeleteCategoryInput) => deleteCategory({ data }),
    onError: (error) => {
      const parsed = parseError(error);
      clientLog.error({ action: 'category.delete.failed', error });
      toast.error(m['categories.toast.deleteError'](), {
        description: parsed.fix ?? parsed.why ?? m['auth.error.unexpected'](),
      });
    },
    onSuccess: () => {
      toast.success(m['categories.toast.deleteSuccess']());
      void queryClient.invalidateQueries({
        queryKey: categoryQueries.all(),
      });
      void router.invalidate();
    },
  });
}
