import { type } from 'arktype';

import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/i18n/number';
import { usePreviewMatch } from '@/modules/rules/hooks/use-preview-match';
import {
  MATCH_REGEX_MAX_LENGTH,
  type MatchPredicate,
  matchPredicateSchema,
} from '@/modules/rules/models';
import { m } from '@/paraglide/messages';

type RulePreviewPanelProps = { match: MatchPredicate };

export function RulePreviewPanel({ match }: RulePreviewPanelProps) {
  const parsed = matchPredicateSchema(match);
  const parseErr = parsed instanceof type.errors ? parsed.summary : null;
  const valid =
    parseErr === null &&
    match.value.length > 0 &&
    !(match.kind === 'regex' && match.value.length > MATCH_REGEX_MAX_LENGTH);
  const query = usePreviewMatch(valid ? match : null);

  return (
    <div className="flex flex-col gap-2 rounded-md border p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">
          {m['rules.preview.title']()}
        </span>
        {query.data && (
          <span className="text-xs text-muted-foreground">
            {m['rules.preview.count']({ count: String(query.data.count) })}
          </span>
        )}
      </div>
      {!valid ? (
        <p className="text-sm text-muted-foreground">
          {parseErr ?? m['rules.form.invalidMatch']()}
        </p>
      ) : query.isError ? (
        <p className="text-sm text-destructive">
          {m['rules.form.previewError']()}
        </p>
      ) : query.isPending ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-4 w-3/5" />
        </div>
      ) : query.data.sample.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {m['rules.preview.empty']()}
        </p>
      ) : (
        <ul className="flex flex-col divide-y text-sm">
          {query.data.sample.map((row) => (
            <li
              key={row.id}
              className="flex items-center justify-between gap-3 py-1.5"
            >
              <span className="truncate">{row.description}</span>
              <span className="font-mono text-xs whitespace-nowrap text-muted-foreground">
                {row.direction === 'debit' ? '-' : '+'}
                {formatCurrency({ amountCents: row.amountCents })}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
