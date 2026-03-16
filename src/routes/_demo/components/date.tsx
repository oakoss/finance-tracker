import { createFileRoute } from '@tanstack/react-router';
import { useMemo, useState } from 'react';

import { Calendar } from '@/components/ui/calendar';
import { DatePicker } from '@/components/ui/date-picker';
import { Timestamp } from '@/components/ui/timestamp';
import { todayISODateString } from '@/lib/i18n/date';
import { Section, Subsection } from '@/routes/_demo/components/-shared';

export const Route = createFileRoute('/_demo/components/date')({
  component: DatePage,
});

function DatePage() {
  const [singleDate, setSingleDate] = useState<Date | undefined>(
    () => new Date(),
  );
  const [rangeFrom, setRangeFrom] = useState<Date | undefined>(
    () => new Date(),
  );
  const [rangeTo, setRangeTo] = useState<Date | undefined>(
    () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const [pickerValue, setPickerValue] = useState(() => todayISODateString());
  const [pickerEmpty, setPickerEmpty] = useState('');
  const now = useMemo(() => new Date(), []);
  const pastDate = useMemo(() => new Date('2024-06-15T14:30:00Z'), []);

  return (
    <div className="space-y-10">
      <Section title="Calendar">
        <Subsection className="block" label="Single selection">
          <Calendar
            mode="single"
            selected={singleDate}
            onSelect={setSingleDate}
          />
        </Subsection>

        <Subsection className="block" label="Range selection">
          <Calendar
            mode="range"
            selected={{ from: rangeFrom, to: rangeTo }}
            onSelect={(range) => {
              setRangeFrom(range?.from);
              setRangeTo(range?.to);
            }}
          />
        </Subsection>

        <Subsection className="block" label="With week numbers">
          <Calendar showWeekNumber mode="single" />
        </Subsection>
      </Section>

      <Section title="DatePicker">
        <Subsection className="block" label="With value">
          <div className="max-w-xs">
            <DatePicker value={pickerValue} onValueChange={setPickerValue} />
          </div>
        </Subsection>

        <Subsection className="block" label="Empty / placeholder">
          <div className="max-w-xs">
            <DatePicker
              placeholder="Select a date"
              value={pickerEmpty}
              onValueChange={setPickerEmpty}
            />
          </div>
        </Subsection>

        <Subsection className="block" label="Disabled">
          <div className="max-w-xs">
            <DatePicker
              disabled
              value={pickerValue}
              onValueChange={setPickerValue}
            />
          </div>
        </Subsection>
      </Section>

      <Section title="Timestamp">
        <Subsection label="Recent date">
          <Timestamp value={now} />
        </Subsection>

        <Subsection label="Past date">
          <Timestamp value={pastDate} />
        </Subsection>

        <Subsection label="From string">
          <Timestamp value="2025-01-01T00:00:00Z" />
        </Subsection>

        <Subsection label="Invalid date">
          <Timestamp value="not-a-date" />
        </Subsection>
      </Section>
    </div>
  );
}
