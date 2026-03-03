import { useNavigate } from '@tanstack/react-router';

import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { m } from '@/paraglide/messages';

export function CategoriesEmpty() {
  const navigate = useNavigate();

  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="prominent">
          <Icons.Tag />
        </EmptyMedia>
        <EmptyTitle>{m['categories.empty.title']()}</EmptyTitle>
        <EmptyDescription>
          {m['categories.empty.description']()}
        </EmptyDescription>
      </EmptyHeader>
      <Button
        size="sm"
        onClick={() =>
          void navigate({ search: { modal: 'create' }, to: '/categories' })
        }
      >
        <Icons.Plus className="size-4" />
        {m['categories.addCategory']()}
      </Button>
    </Empty>
  );
}
