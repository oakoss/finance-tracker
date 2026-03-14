import { useMemo } from 'react';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard';
import { useHydrated } from '@/hooks/use-hydrated';
import {
  formatDateTime,
  formatDateTimeFull,
  formatRelativeTime,
  getUserTimeZone,
} from '@/lib/i18n/date';
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
  const hydrated = useHydrated();

  if (Number.isNaN(date.getTime())) {
    return <span className={className}>--</span>;
  }

  const iso = date.toISOString();

  const tooltipRows = hydrated ? getTooltipRows(date) : [];

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          className={cn(
            'cursor-default hover:underline hover:decoration-muted-foreground/50 hover:decoration-dotted hover:underline-offset-2',
            className,
          )}
          render={<time dateTime={iso} />}
        >
          {formatDateTime({ value: date })}
        </TooltipTrigger>
        <TooltipContent className="max-w-none p-0" side="bottom" sideOffset={6}>
          <div className="grid gap-0 font-mono text-[11px] leading-relaxed">
            {tooltipRows.map(({ label, value: v }) => (
              <TimestampRow key={label} label={label} value={v} />
            ))}
            <TimestampRow label="Timestamp" value={iso} />
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function getTooltipRows(date: Date): { label: string; value: string }[] {
  const userTimeZone = getUserTimeZone();
  const rows = [
    {
      label: 'UTC',
      value: formatDateTimeFull({ timeZone: 'UTC', value: date }),
    },
  ];

  if (userTimeZone !== 'UTC') {
    rows.push({
      label: userTimeZone,
      value: formatDateTimeFull({ timeZone: userTimeZone, value: date }),
    });
  }

  rows.push({ label: 'Relative', value: formatRelativeTime({ value: date }) });

  return rows;
}

function TimestampRow({ label, value }: { label: string; value: string }) {
  const { copied, copy } = useCopyToClipboard({ timeout: 1500 });

  return (
    <button
      className="flex w-full items-baseline justify-between px-3 py-1 text-left transition-colors first:pt-2 last:pb-2 hover:bg-background/10"
      type="button"
      onClick={() => copy(value)}
    >
      <span className="shrink-0 text-background/60">{label}</span>
      <span className="text-right text-background tabular-nums">
        {copied ? 'Copied!' : value}
      </span>
    </button>
  );
}

export { Timestamp };
export type { TimestampProps };
