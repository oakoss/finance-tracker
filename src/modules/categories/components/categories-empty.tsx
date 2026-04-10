import { useNavigate } from '@tanstack/react-router';

import { Icons } from '@/components/icons';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { MutationGate } from '@/modules/auth/components/mutation-gate';
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
      <MutationGate
        size="sm"
        onClick={() =>
          void navigate({ search: { modal: 'create' }, to: '/categories' })
        }
      >
        <Icons.Plus className="size-4" />
        {m['categories.addCategory']()}
      </MutationGate>
    </Empty>
  );
}
