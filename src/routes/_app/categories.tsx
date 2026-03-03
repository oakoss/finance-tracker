import { useSuspenseQuery } from '@tanstack/react-query';
import {
  createFileRoute,
  type ErrorComponentProps,
} from '@tanstack/react-router';
import { type } from 'arktype';

import { RootErrorBoundary } from '@/components/errors/root-error-boundary';
import { CategoriesDataGrid } from '@/modules/categories/components/categories-data-grid';
import { CategoriesEmpty } from '@/modules/categories/components/categories-empty';
import { CategoriesPageHeader } from '@/modules/categories/components/categories-page-header';
import { CreateCategoryDialog } from '@/modules/categories/components/create-category-dialog';
import { EditCategoryDialog } from '@/modules/categories/components/edit-category-dialog';
import { categoryQueries } from '@/modules/categories/hooks/use-categories';

const searchSchema = type({
  'edit?': 'string',
  'modal?': type.enumerated('create'),
});

export const Route = createFileRoute('/_app/categories')({
  component: CategoriesPage,
  errorComponent: CategoriesError,
  validateSearch: (raw) => {
    const result = searchSchema(raw);
    if (result instanceof type.errors) return {};
    return result;
  },
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(categoryQueries.list()),
});

function CategoriesPage() {
  const { data: categories } = useSuspenseQuery(categoryQueries.list());

  return (
    <div className="flex flex-1 flex-col gap-6 px-4 py-6 lg:px-6">
      <CategoriesPageHeader />
      {categories.length === 0 ? (
        <CategoriesEmpty />
      ) : (
        <CategoriesDataGrid data={categories} />
      )}
      <CreateCategoryDialog />
      <EditCategoryDialog categories={categories} />
    </div>
  );
}

function CategoriesError(props: ErrorComponentProps) {
  return (
    <div className="flex flex-1 flex-col px-4 py-6 lg:px-6">
      <RootErrorBoundary {...props} />
    </div>
  );
}
