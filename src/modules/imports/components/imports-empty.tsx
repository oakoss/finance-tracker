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

export function ImportsEmpty() {
  const navigate = useNavigate();

  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="prominent">
          <Icons.Upload />
        </EmptyMedia>
        <EmptyTitle>{m['imports.empty.title']()}</EmptyTitle>
        <EmptyDescription>{m['imports.empty.description']()}</EmptyDescription>
      </EmptyHeader>
      <MutationGate
        size="sm"
        onClick={() =>
          void navigate({ search: { modal: 'upload' }, to: '/imports' })
        }
      >
        <Icons.Plus className="size-4" />
        {m['imports.uploadCsv']()}
      </MutationGate>
    </Empty>
  );
}
