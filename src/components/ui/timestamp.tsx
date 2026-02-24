import { useMemo } from 'react';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard';
import {
  formatDateTime,
  formatDateTimeFull,
  formatRelativeTime,
  getUserTimeZone,
} from '@/lib/i18n';
import { cn } from '@/lib/utils';

type TimestampProps = {
  className?: string;
  value: Date | string;
};

function Timestamp({ className, value }: TimestampProps) {
  const date = useMemo(
    () => (value instanceof Date ? value : new Date(value)),
    [value],
  );

  const userTimeZone = useMemo(() => getUserTimeZone(), []);
  const showLocalTime = userTimeZone !== 'UTC';

  const utc = formatDateTimeFull({ timeZone: 'UTC', value: date });
  const local = showLocalTime
    ? formatDateTimeFull({ timeZone: userTimeZone, value: date })
    : null;
  const relative = formatRelativeTime({ value: date });
  const iso = date.toISOString();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          className={cn(
            'cursor-default hover:underline hover:decoration-dotted hover:decoration-muted-foreground/50 hover:underline-offset-2',
            className,
          )}
          render={<time dateTime={iso} />}
        >
          {formatDateTime({ value: date })}
        </TooltipTrigger>
        <TooltipContent className="max-w-none p-0" side="bottom" sideOffset={6}>
          <div className="grid gap-0 font-mono text-[11px] leading-relaxed">
            <TimestampRow label="UTC" value={utc} />
            {local && <TimestampRow label={userTimeZone} value={local} />}
            <TimestampRow label="Relative" value={relative} />
            <TimestampRow label="Timestamp" value={iso} />
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function TimestampRow({ label, value }: { label: string; value: string }) {
  const { copied, copy } = useCopyToClipboard({ timeout: 1500 });

  return (
    <button
      className="flex w-full items-baseline justify-between px-3 py-1 text-left transition-colors first:pt-2 last:pb-2 hover:bg-background/10"
      type="button"
      onClick={() => copy(value)}
    >
      <span className="text-background/60 shrink-0">{label}</span>
      <span className="text-background tabular-nums text-right">
        {copied ? 'Copied!' : value}
      </span>
    </button>
  );
}

export { Timestamp };
export type { TimestampProps };
