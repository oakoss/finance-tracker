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

export function RulesEmpty() {
  const navigate = useNavigate();

  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="prominent">
          <Icons.Wand2 />
        </EmptyMedia>
        <EmptyTitle>{m['rules.empty.title']()}</EmptyTitle>
        <EmptyDescription>{m['rules.empty.description']()}</EmptyDescription>
      </EmptyHeader>
      <MutationGate
        size="sm"
        onClick={() =>
          void navigate({ search: { modal: 'create' }, to: '/rules' })
        }
      >
        <Icons.Plus className="size-4" />
        {m['rules.empty.cta']()}
      </MutationGate>
    </Empty>
  );
}
