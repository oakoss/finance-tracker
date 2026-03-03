import { useNavigate } from '@tanstack/react-router';

import type { CategoryListItem } from '@/modules/categories/api/list-categories';

import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DeleteCategoryAction } from '@/modules/categories/components/delete-category-action';
import { m } from '@/paraglide/messages';

type CategoryRowActionsProps = {
  row: CategoryListItem;
};

export function CategoryRowActions({ row }: CategoryRowActionsProps) {
  const navigate = useNavigate();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button size="icon-sm" variant="ghost">
            <Icons.EllipsisVertical className="size-4" />
            <span className="sr-only">{m['categories.actions']()}</span>
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() =>
            void navigate({
              search: { edit: row.id },
              to: '/categories',
            })
          }
        >
          <Icons.Settings2 className="size-4" />
          {m['actions.edit']()}
        </DropdownMenuItem>
        <DeleteCategoryAction category={row} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
