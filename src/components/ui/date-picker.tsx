import { useState } from 'react';

import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { formatDate } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { m } from '@/paraglide/messages';

function formatDateToISO(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

type DatePickerProps = {
  disabled?: boolean;
  id?: string;
  onBlur?: () => void;
  onValueChange: (value: string) => void;
  placeholder?: string;
  value?: string;
};

function DatePicker({
  disabled,
  id,
  onBlur,
  onValueChange,
  placeholder,
  value,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);

  const selected = value ? new Date(`${value}T00:00:00`) : undefined;

  return (
    <Popover
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) onBlur?.();
      }}
    >
      <PopoverTrigger
        render={
          <Button
            className={cn(
              'w-full justify-start text-left font-normal',
              !value && 'text-muted-foreground',
            )}
            disabled={disabled}
            id={id}
            variant="outline"
          />
        }
      >
        <Icons.Calendar className="size-4" data-icon="inline-start" />
        {selected
          ? formatDate({ value: selected })
          : (placeholder ?? m['common.pickDate']())}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(date) => {
            if (date) {
              onValueChange(formatDateToISO(date));
              setOpen(false);
            }
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

export { DatePicker };
