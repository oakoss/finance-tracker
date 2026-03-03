import { createColumnHelper } from '@tanstack/react-table';

import type { CategoryListItem } from '@/modules/categories/api/list-categories';

import { Skeleton } from '@/components/ui/skeleton';
import { CategoryRowActions } from '@/modules/categories/components/category-row-actions';
import { CategoryTypeBadge } from '@/modules/categories/components/category-type-badge';
import { m } from '@/paraglide/messages';

const columnHelper = createColumnHelper<CategoryListItem>();

export function createCategoryColumns(categories: CategoryListItem[]) {
  return [
    columnHelper.accessor('name', {
      cell: ({ getValue }) => <span className="font-medium">{getValue()}</span>,
      header: () => m['categories.columns.name'](),
      meta: {
        headerTitle: m['categories.columns.name'](),
        skeleton: <Skeleton className="h-4 w-32" />,
      },
      size: 200,
    }),
    columnHelper.accessor('type', {
      cell: ({ getValue }) => <CategoryTypeBadge type={getValue()} />,
      header: () => m['categories.columns.type'](),
      meta: {
        headerTitle: m['categories.columns.type'](),
        skeleton: <Skeleton className="h-5 w-20" />,
      },
      size: 140,
    }),
    columnHelper.accessor('parentId', {
      cell: ({ getValue }) => {
        const parentId = getValue();
        if (!parentId) return <span className="text-muted-foreground">--</span>;
        const parent = categories.find((c) => c.id === parentId);
        return (
          <span className="text-muted-foreground">{parent?.name ?? '--'}</span>
        );
      },
      header: () => m['categories.columns.parent'](),
      meta: {
        headerTitle: m['categories.columns.parent'](),
        skeleton: <Skeleton className="h-4 w-24" />,
      },
      size: 180,
    }),
    columnHelper.display({
      cell: ({ row }) => {
        const count = categories.filter(
          (c) => c.parentId === row.original.id,
        ).length;
        return <span className="text-muted-foreground">{count}</span>;
      },
      header: () => m['categories.columns.subcategories'](),
      id: 'subcategories',
      meta: {
        headerTitle: m['categories.columns.subcategories'](),
        skeleton: <Skeleton className="h-4 w-8" />,
      },
      size: 120,
    }),
    columnHelper.display({
      cell: ({ row }) => <CategoryRowActions row={row.original} />,
      id: 'actions',
      meta: {
        cellClassName: 'text-right',
        headerClassName: 'text-right',
        skeleton: <Skeleton className="ml-auto size-7" />,
      },
      size: 60,
    }),
  ];
}
