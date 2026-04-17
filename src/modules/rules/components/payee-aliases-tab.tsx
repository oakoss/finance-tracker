import { Icons } from '@/components/icons';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { m } from '@/paraglide/messages';

export function PayeeAliasesTab() {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="prominent">
          <Icons.Tag />
        </EmptyMedia>
        <EmptyTitle>{m['rules.aliases.title']()}</EmptyTitle>
        <EmptyDescription>{m['rules.aliases.comingSoon']()}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
