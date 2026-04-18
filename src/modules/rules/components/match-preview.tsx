import type { MatchPredicate } from '@/modules/rules/models';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { m } from '@/paraglide/messages';

const KIND_LABEL = {
  contains: () => m['rules.form.kindContains'](),
  ends_with: () => m['rules.form.kindEndsWith'](),
  exact: () => m['rules.form.kindExact'](),
  regex: () => m['rules.form.kindRegex'](),
  starts_with: () => m['rules.form.kindStartsWith'](),
} satisfies Record<MatchPredicate['kind'], () => string>;

export type MatchPreviewProps = { className?: string; match: MatchPredicate };

export function MatchPreview({ className, match }: MatchPreviewProps) {
  const kindLabel = KIND_LABEL[match.kind]();
  return (
    <div className={cn('flex min-w-0 items-center gap-2', className)}>
      <Badge size="sm" variant="outline">
        {kindLabel}
      </Badge>
      <span className="truncate font-mono text-sm" title={match.value}>
        {match.value || m['rules.match.emptyValue']()}
      </span>
    </div>
  );
}

export function formatMatchPreview(match: MatchPredicate): string {
  const kind = KIND_LABEL[match.kind]();
  return match.value ? `${kind}: ${match.value}` : kind;
}
