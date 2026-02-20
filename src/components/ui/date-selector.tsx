import {
  addMonths,
  format,
  isBefore,
  isSameMonth,
  parse,
  subMonths,
} from 'date-fns';
import {
  type ChangeEvent,
  type ComponentProps,
  createContext,
  use,
  useCallback,
  useMemo,
  useState,
} from 'react';
import { type DateRange, type DayButton } from 'react-day-picker';

import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Calendar, CalendarDayButton } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

export type DateSelectorI18nConfig = {
  // Labels
  selectDate: string;
  apply: string;
  cancel: string;
  clear: string;
  today: string;
  // Filter types
  filterTypes: {
    is: string;
    before: string;
    after: string;
    between: string;
  };
  // Period types
  periodTypes: {
    day: string;
    month: string;
    quarter: string;
    halfYear: string;
    year: string;
  };
  // Months
  months: string[];
  monthsShort: string[];
  // Quarters
  quarters: string[];
  // Half years
  halfYears: string[];
  // Weekdays
  weekdays: string[];
  weekdaysShort: string[];
  // Placeholders
  placeholder: string;
  rangePlaceholder: string;
};

export const DEFAULT_DATE_SELECTOR_I18N: DateSelectorI18nConfig = {
  apply: 'Apply',
  cancel: 'Cancel',
  clear: 'Clear',
  filterTypes: {
    after: 'after',
    before: 'before',
    between: 'between',
    is: 'is',
  },
  halfYears: ['H1', 'H2'],
  months: [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ],
  monthsShort: [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ],
  periodTypes: {
    day: 'Day',
    halfYear: 'Half-year',
    month: 'Month',
    quarter: 'Quarter',
    year: 'Year',
  },
  placeholder: 'Select date...',
  quarters: ['Q1', 'Q2', 'Q3', 'Q4'],
  rangePlaceholder: 'Select date range...',
  selectDate: 'Select date',
  today: 'Today',
  weekdays: [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ],
  weekdaysShort: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'],
};

export type DateSelectorPeriodType =
  | 'day'
  | 'month'
  | 'quarter'
  | 'half-year'
  | 'year';
export type DateSelectorFilterType = 'is' | 'before' | 'after' | 'between';

export type DateSelectorValue = {
  period: DateSelectorPeriodType;
  operator: DateSelectorFilterType;
  startDate?: Date;
  endDate?: Date;
  year?: number;
  month?: number;
  quarter?: number;
  halfYear?: number;
  rangeStart?: { year: number; value: number };
  rangeEnd?: { year: number; value: number };
};

export type DateSelectorContextValue = {
  i18n: DateSelectorI18nConfig;
  variant: 'outline' | 'default';
  size: 'sm' | 'default' | 'lg';
};

const DateSelectorContext = createContext<DateSelectorContextValue>({
  i18n: DEFAULT_DATE_SELECTOR_I18N,
  size: 'default',
  variant: 'outline',
});

export const useDateSelectorContext = () => use(DateSelectorContext);

export function formatDateValue(
  value: DateSelectorValue,
  i18n: DateSelectorI18nConfig = DEFAULT_DATE_SELECTOR_I18N,
  dayDateFormat = 'MM/dd/yyyy',
): string {
  const {
    period,
    startDate,
    endDate,
    year,
    month,
    quarter,
    halfYear,
    rangeStart,
    rangeEnd,
  } = value;

  if (period === 'day') {
    if (startDate && endDate) {
      return `${format(startDate, dayDateFormat)} - ${format(endDate, dayDateFormat)}`;
    }
    if (startDate) {
      return format(startDate, dayDateFormat);
    }
    return '';
  }

  if (period === 'month') {
    if (rangeStart && rangeEnd) {
      return `${i18n.monthsShort[rangeStart.value]} ${rangeStart.year} - ${i18n.monthsShort[rangeEnd.value]} ${rangeEnd.year}`;
    }
    if (year !== undefined && month !== undefined) {
      return `${i18n.monthsShort[month]} ${year}`;
    }
    return '';
  }

  if (period === 'quarter') {
    if (rangeStart && rangeEnd) {
      return `${i18n.quarters[rangeStart.value]} ${rangeStart.year} - ${i18n.quarters[rangeEnd.value]} ${rangeEnd.year}`;
    }
    if (year !== undefined && quarter !== undefined) {
      return `${i18n.quarters[quarter]} ${year}`;
    }
    return '';
  }

  if (period === 'half-year') {
    if (rangeStart && rangeEnd) {
      return `${i18n.halfYears[rangeStart.value]} ${rangeStart.year} - ${i18n.halfYears[rangeEnd.value]} ${rangeEnd.year}`;
    }
    if (year !== undefined && halfYear !== undefined) {
      return `${i18n.halfYears[halfYear]} ${year}`;
    }
    return '';
  }

  if (period === 'year') {
    if (rangeStart && rangeEnd) {
      return `${rangeStart.year} - ${rangeEnd.year}`;
    }
    if (year !== undefined) {
      return `${year}`;
    }
    return '';
  }

  return '';
}

type DateSelectorYearOptions =
  | {
      yearRange?: number;
      minYear?: undefined;
      maxYear?: undefined;
    }
  | {
      yearRange?: undefined;
      minYear?: number;
      maxYear?: number;
    };

type UseDateSelectorOptions = DateSelectorYearOptions & {
  value?: DateSelectorValue;
  onChange?: (value: DateSelectorValue) => void;
  defaultPeriodType?: DateSelectorPeriodType;
  defaultFilterType?: DateSelectorFilterType;
  presetMode?: DateSelectorFilterType;
  allowRange?: boolean;
  baseYear?: number;
  periodTypes?: DateSelectorPeriodType[];
};

export function useDateSelector({
  value,
  onChange,
  defaultPeriodType = 'day',
  defaultFilterType = 'is',
  presetMode,
  allowRange = true,
  yearRange = 11,
  baseYear,
  minYear,
  maxYear,
  periodTypes,
}: UseDateSelectorOptions) {
  const currentYear = baseYear ?? new Date().getFullYear();

  const validDefaultPeriodType = useMemo(() => {
    if (!periodTypes || periodTypes.length === 0) return defaultPeriodType;
    if (periodTypes.includes(defaultPeriodType)) return defaultPeriodType;
    return periodTypes[0];
  }, [periodTypes, defaultPeriodType]);

  // Use presetMode if provided, otherwise use value or default
  const effectiveFilterType =
    presetMode ?? value?.operator ?? defaultFilterType;

  const isControlled = value !== undefined;

  const [periodTypeState, setPeriodTypeState] =
    useState<DateSelectorPeriodType>(
      () => value?.period ?? validDefaultPeriodType,
    );
  const [filterTypeState, setFilterTypeState] =
    useState<DateSelectorFilterType>(() => effectiveFilterType);
  const [selectedDateState, setSelectedDateState] = useState<Date | undefined>(
    () => value?.startDate,
  );
  const [selectedEndDateState, setSelectedEndDateState] = useState<
    Date | undefined
  >(() => value?.endDate);
  const [calendarMonth, setCalendarMonth] = useState(
    () => value?.startDate ?? new Date(),
  );
  const [selectedYearState, setSelectedYearState] = useState<
    number | undefined
  >(() => value?.year);
  const [selectedMonthState, setSelectedMonthState] = useState<
    number | undefined
  >(() => value?.month);
  const [selectedQuarterState, setSelectedQuarterState] = useState<
    number | undefined
  >(() => value?.quarter);
  const [selectedHalfYearState, setSelectedHalfYearState] = useState<
    number | undefined
  >(() => value?.halfYear);
  const [rangeStartState, setRangeStartState] = useState<
    { year: number; value: number } | undefined
  >(() => value?.rangeStart);
  const [rangeEndState, setRangeEndState] = useState<
    { year: number; value: number } | undefined
  >(() => value?.rangeEnd);
  const [hoverDate, setHoverDate] = useState<Date | null>(null);

  const periodType = value?.period ?? periodTypeState;
  const filterType = presetMode ?? value?.operator ?? filterTypeState;
  const selectedDate = isControlled ? value?.startDate : selectedDateState;
  const selectedEndDate = isControlled ? value?.endDate : selectedEndDateState;
  const selectedYear = isControlled ? value?.year : selectedYearState;
  const selectedMonth = isControlled ? value?.month : selectedMonthState;
  const selectedQuarter = isControlled ? value?.quarter : selectedQuarterState;
  const selectedHalfYear = isControlled
    ? value?.halfYear
    : selectedHalfYearState;
  const rangeStart = isControlled ? value?.rangeStart : rangeStartState;
  const rangeEnd = isControlled ? value?.rangeEnd : rangeEndState;

  const setSelectedDate = useCallback(
    (date?: Date) => {
      if (!isControlled) {
        setSelectedDateState(date);
      }
    },
    [isControlled],
  );

  const setSelectedEndDate = useCallback(
    (date?: Date) => {
      if (!isControlled) {
        setSelectedEndDateState(date);
      }
    },
    [isControlled],
  );

  const years = useMemo(() => {
    if (minYear !== undefined && maxYear !== undefined) {
      return Array.from(
        { length: maxYear - minYear + 1 },
        (_, i) => minYear + i,
      );
    }
    return Array.from(
      { length: yearRange },
      (_, i) => currentYear - Math.floor(yearRange / 2) + i,
    );
  }, [currentYear, yearRange, minYear, maxYear]);

  const currentValue = useMemo<DateSelectorValue>(
    () => ({
      endDate: selectedEndDate,
      halfYear: selectedHalfYear,
      month: selectedMonth,
      operator: presetMode ?? filterType,
      period: periodType,
      quarter: selectedQuarter,
      rangeEnd,
      rangeStart,
      startDate: selectedDate,
      year: selectedYear,
    }),
    [
      periodType,
      presetMode,
      filterType,
      selectedDate,
      selectedEndDate,
      selectedYear,
      selectedMonth,
      selectedQuarter,
      selectedHalfYear,
      rangeStart,
      rangeEnd,
    ],
  );

  function buildValue(overrides: Partial<DateSelectorValue>) {
    const operator =
      presetMode ??
      overrides.operator ??
      currentValue.operator ??
      defaultFilterType;
    const period =
      overrides.period ?? currentValue.period ?? validDefaultPeriodType;

    return {
      endDate: overrides.endDate ?? currentValue.endDate,
      halfYear: overrides.halfYear ?? currentValue.halfYear,
      month: overrides.month ?? currentValue.month,
      operator,
      period,
      quarter: overrides.quarter ?? currentValue.quarter,
      rangeEnd: overrides.rangeEnd ?? currentValue.rangeEnd,
      rangeStart: overrides.rangeStart ?? currentValue.rangeStart,
      startDate: overrides.startDate ?? currentValue.startDate,
      year: overrides.year ?? currentValue.year,
    } satisfies DateSelectorValue;
  }

  function emitChange(overrides: Partial<DateSelectorValue>) {
    const nextValue = buildValue(overrides);

    if (!isControlled) {
      setPeriodTypeState(nextValue.period ?? validDefaultPeriodType);
      setFilterTypeState(nextValue.operator ?? defaultFilterType);
      setSelectedDateState(nextValue.startDate);
      setSelectedEndDateState(nextValue.endDate);
      setSelectedYearState(nextValue.year);
      setSelectedMonthState(nextValue.month);
      setSelectedQuarterState(nextValue.quarter);
      setSelectedHalfYearState(nextValue.halfYear);
      setRangeStartState(nextValue.rangeStart);
      setRangeEndState(nextValue.rangeEnd);
    }

    onChange?.(nextValue);
  }

  function clearSelection() {
    emitChange({
      endDate: undefined,
      halfYear: undefined,
      month: undefined,
      quarter: undefined,
      rangeEnd: undefined,
      rangeStart: undefined,
      startDate: undefined,
      year: undefined,
    });
  }

  function handleDayClick(day: Date) {
    if (filterType === 'between' && allowRange) {
      if (!selectedDate || selectedEndDate) {
        emitChange({
          endDate: undefined,
          startDate: day,
        });
      } else if (isBefore(day, selectedDate)) {
        emitChange({
          endDate: selectedDate,
          startDate: day,
        });
      } else {
        emitChange({
          endDate: day,
          startDate: selectedDate,
        });
      }

      return;
    }

    emitChange({
      endDate: undefined,
      startDate: day,
    });
  }

  function handlePeriodSelect(year: number, value: number) {
    const periodOverrides = {
      halfYear: periodType === 'half-year' ? value : undefined,
      month: periodType === 'month' ? value : undefined,
      quarter: periodType === 'quarter' ? value : undefined,
      year,
    } satisfies Partial<DateSelectorValue>;

    if (filterType === 'between' && allowRange) {
      if (!rangeStart || rangeEnd) {
        emitChange({
          ...periodOverrides,
          rangeEnd: undefined,
          rangeStart: { year, value },
        });
      } else {
        const startKey = rangeStart.year * 100 + rangeStart.value;
        const endKey = year * 100 + value;
        if (endKey < startKey) {
          emitChange({
            ...periodOverrides,
            rangeEnd: rangeStart,
            rangeStart: { year, value },
          });
        } else {
          emitChange({
            ...periodOverrides,
            rangeEnd: { year, value },
          });
        }
      }

      return;
    }

    emitChange({
      ...periodOverrides,
      rangeEnd: undefined,
      rangeStart: undefined,
    });
  }

  function handleYearSelect(year: number) {
    if (filterType === 'between' && allowRange) {
      if (!rangeStart || rangeEnd) {
        emitChange({
          rangeEnd: undefined,
          rangeStart: { year, value: 0 },
          year,
        });
      } else if (year < rangeStart.year) {
        emitChange({
          rangeEnd: rangeStart,
          rangeStart: { year, value: 0 },
          year,
        });
      } else {
        emitChange({
          rangeEnd: { year, value: 0 },
          year,
        });
      }

      return;
    }

    emitChange({
      rangeEnd: undefined,
      rangeStart: undefined,
      year,
    });
  }

  function handlePeriodTypeChange(type: DateSelectorPeriodType) {
    emitChange({
      endDate: undefined,
      halfYear: undefined,
      month: undefined,
      period: type,
      quarter: undefined,
      rangeEnd: undefined,
      rangeStart: undefined,
      startDate: undefined,
      year: undefined,
    });
  }

  function handleFilterTypeChange(type: DateSelectorFilterType) {
    if (presetMode !== undefined) return;

    emitChange({
      endDate: undefined,
      halfYear: undefined,
      month: undefined,
      operator: type,
      quarter: undefined,
      rangeEnd: undefined,
      rangeStart: undefined,
      startDate: undefined,
      year: undefined,
    });
  }

  const isInRange = useCallback(
    (year: number, value: number) => {
      if (!rangeStart || !rangeEnd) return false;
      const key = year * 100 + value;
      const startKey = rangeStart.year * 100 + rangeStart.value;
      const endKey = rangeEnd.year * 100 + rangeEnd.value;
      return key >= startKey && key <= endKey;
    },
    [rangeStart, rangeEnd],
  );

  const isYearInRange = useCallback(
    (year: number) => {
      if (!rangeStart || !rangeEnd) return false;
      return year >= rangeStart.year && year <= rangeEnd.year;
    },
    [rangeStart, rangeEnd],
  );

  // Changes are emitted by interaction handlers.

  return {
    allowRange,

    calendarMonth,

    // Actions
    clearSelection,

    currentValue,

    filterType,

    handleDayClick,

    handlePeriodSelect,

    handleYearSelect,

    hoverDate,

    isInRange,

    isYearInRange,

    // State
    periodType,

    rangeEnd,

    rangeStart,

    selectedDate,

    selectedEndDate,

    selectedHalfYear,

    selectedMonth,

    selectedQuarter,

    selectedYear,

    setCalendarMonth,

    setFilterType: handleFilterTypeChange,

    setHoverDate,

    // Setters
    setPeriodType: handlePeriodTypeChange,

    setSelectedDate,
    setSelectedEndDate,
    years,
  };
}

type DateSelectorFilterToggleProps = {
  value: DateSelectorFilterType;
  onChange: (value: DateSelectorFilterType) => void;
  showBetween?: boolean;
  showIs?: boolean;
  presetMode?: DateSelectorFilterType;
  className?: string;
};

function DateSelectorFilterToggle({
  value,
  onChange,
  showBetween = true,
  showIs = true,
  presetMode,
  className,
}: DateSelectorFilterToggleProps) {
  const { i18n } = useDateSelectorContext();
  const isDisabled = presetMode !== undefined;

  return (
    <Tabs
      className={className}
      value={value}
      onValueChange={(newValue) => {
        if (!isDisabled && newValue) {
          onChange(newValue as DateSelectorFilterType);
        }
      }}
    >
      <TabsList
        className={cn(
          'bg-muted/80',
          isDisabled && 'pointer-events-none opacity-50',
          className,
        )}
      >
        {showIs && (
          <TabsTrigger
            aria-label={i18n.filterTypes.is}
            className="py-1 font-normal"
            value="is"
          >
            {i18n.filterTypes.is}
          </TabsTrigger>
        )}
        <TabsTrigger
          aria-label={i18n.filterTypes.before}
          className="py-1 font-normal"
          value="before"
        >
          {i18n.filterTypes.before}
        </TabsTrigger>
        <TabsTrigger
          aria-label={i18n.filterTypes.after}
          className="py-1 font-normal"
          value="after"
        >
          {i18n.filterTypes.after}
        </TabsTrigger>
        {showBetween && (
          <TabsTrigger
            aria-label={i18n.filterTypes.between}
            className="py-1 font-normal"
            value="between"
          >
            {i18n.filterTypes.between}
          </TabsTrigger>
        )}
      </TabsList>
    </Tabs>
  );
}

type DateSelectorDateSelectorPeriodTabsProps = {
  value: DateSelectorPeriodType;
  onChange: (value: DateSelectorPeriodType) => void;
  periodTypes?: DateSelectorPeriodType[];
  className?: string;
  calendarMonth?: Date;
  onMonthChange?: (date: Date) => void;
  showNavigationButtons?: boolean;
};

function DateSelectorPeriodTabs({
  value,
  onChange,
  periodTypes,
  className,
  calendarMonth,
  onMonthChange,
  showNavigationButtons = false,
}: DateSelectorDateSelectorPeriodTabsProps) {
  const { i18n } = useDateSelectorContext();

  const tabs: { value: DateSelectorPeriodType; label: string }[] = [
    { value: 'day', label: i18n.periodTypes.day },
    { value: 'month', label: i18n.periodTypes.month },
    { value: 'quarter', label: i18n.periodTypes.quarter },
    { value: 'half-year', label: i18n.periodTypes.halfYear },
    { value: 'year', label: i18n.periodTypes.year },
  ];

  const filteredTabs = periodTypes
    ? tabs.filter((tab) => periodTypes.includes(tab.value))
    : tabs;

  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-3',
        className,
      )}
    >
      <Tabs
        value={value}
        onValueChange={(newValue) => {
          if (newValue) {
            onChange(newValue as DateSelectorPeriodType);
          }
        }}
      >
        <TabsList>
          {filteredTabs.map((tab) => (
            <TabsTrigger
              key={tab.value}
              aria-label={tab.label}
              className="p-1 font-normal sm:px-2.5"
              value={tab.value}
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      {showNavigationButtons &&
        value === 'day' &&
        calendarMonth &&
        onMonthChange && (
          <div className="flex items-center">
            {(() => {
              const today = new Date();
              const isCurrentMonth = isSameMonth(calendarMonth, today);

              // Only show today button if not on current month
              if (isCurrentMonth) {
                return null;
              }

              // Determine direction based on whether calendarMonth is in future or past
              const isFuture = calendarMonth > today;

              return (
                <Button
                  className="size-8.5"
                  title={i18n.today}
                  variant="ghost"
                  onClick={() => onMonthChange(new Date())}
                >
                  {isFuture ? <Icons.CornerUpLeft /> : <Icons.CornerUpRight />}
                </Button>
              );
            })()}
            <Button
              className="size-8.5"
              variant="ghost"
              onClick={() => onMonthChange(subMonths(calendarMonth, 1))}
            >
              <Icons.ChevronLeft className="size-4" />
            </Button>
            <Button
              className="size-8.5"
              variant="ghost"
              onClick={() => onMonthChange(addMonths(calendarMonth, 1))}
            >
              <Icons.ChevronRight className="size-4" />
            </Button>
          </div>
        )}
    </div>
  );
}

type DateSelectorDayPickerProps = {
  currentMonth: Date;
  selectedDate?: Date;
  selectedEndDate?: Date;
  onDayClick: (day: Date) => void;
  isRange: boolean;
  onDayHover?: (day: Date | null) => void;
  hoverDate?: Date | null;
  showTwoMonths?: boolean;
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  className?: string;
};

function DateSelectorDayPicker({
  currentMonth,
  selectedDate,
  selectedEndDate,
  onDayClick,
  isRange,
  onDayHover,
  hoverDate,
  showTwoMonths = true,
  weekStartsOn,
  className,
}: DateSelectorDayPickerProps) {
  const { i18n } = useDateSelectorContext();
  const isMobile = useIsMobile();

  // Convert to react-day-picker format
  const selected: Date | DateRange | undefined = isRange
    ? selectedDate && selectedEndDate
      ? { from: selectedDate, to: selectedEndDate }
      : selectedDate
        ? { from: selectedDate, to: hoverDate ?? selectedDate }
        : undefined
    : selectedDate;

  const handleSelect = (date: Date | DateRange | undefined) => {
    if (!date) {
      return;
    }

    if (isRange && 'from' in date) {
      // For range mode
      if (date.from && !date.to) {
        // First click - set start date
        onDayClick(date.from);
      } else if (date.from && date.to) {
        // Range selected - set end date
        onDayClick(date.to);
      }
    } else if (!isRange && date instanceof Date) {
      onDayClick(date);
    }
  };

  // Create custom DayButton component with hover support
  const CustomDayButton = useCallback(
    (props: ComponentProps<typeof DayButton>) => {
      return (
        <CalendarDayButton
          {...props}
          onMouseEnter={() => {
            if (isRange && onDayHover && props.day) {
              onDayHover(props.day.date);
            }
          }}
          onMouseLeave={() => {
            if (isRange && onDayHover) {
              onDayHover(null);
            }
          }}
        />
      );
    },
    [isRange, onDayHover],
  );

  // Create custom formatters for i18n
  const formatters = {
    formatWeekdayName: (date: Date) => {
      const dayIndex = date.getDay();
      return i18n.weekdaysShort[dayIndex] ?? i18n.weekdays[dayIndex];
    },
    formatMonthCaption: (date: Date) => {
      const monthIndex = date.getMonth();
      const year = date.getFullYear();
      return `${i18n.months[monthIndex]} ${year}`;
    },
  };

  return (
    <div className={cn('flex w-full items-center justify-between', className)}>
      {isRange ? (
        <Calendar
          className="w-full shrink-0 p-0"
          classNames={{
            month: 'flex flex-col items-center min-w-0 flex-1',
            months: 'flex flex-wrap items-start justify-between gap-5 w-full',
            nav: 'hidden',
          }}
          components={{
            DayButton: CustomDayButton,
          }}
          formatters={formatters}
          mode="range"
          month={currentMonth}
          numberOfMonths={isMobile ? 1 : showTwoMonths ? 2 : 1}
          selected={selected as DateRange | undefined}
          showOutsideDays={true}
          weekStartsOn={weekStartsOn}
          onSelect={handleSelect as (range: DateRange | undefined) => void}
        />
      ) : (
        <Calendar
          className="w-full shrink-0 p-0"
          classNames={{
            month: 'flex flex-col items-center min-w-0 flex-1',
            months: 'flex flex-wrap items-start justify-between gap-5 w-full',
            nav: 'hidden',
          }}
          components={{
            DayButton: CustomDayButton,
          }}
          formatters={formatters}
          mode="single"
          month={currentMonth}
          numberOfMonths={isMobile ? 1 : showTwoMonths ? 2 : 1}
          selected={selected as Date | undefined}
          showOutsideDays={true}
          weekStartsOn={weekStartsOn}
          onSelect={handleSelect as (date: Date | undefined) => void}
        />
      )}
    </div>
  );
}

type DateSelectorDateSelectorPeriodGridProps = {
  years: number[];
  items: string[];
  selectedYear?: number;
  selectedValue?: number;
  rangeStart?: { year: number; value: number };
  rangeEnd?: { year: number; value: number };
  isInRange: (year: number, value: number) => boolean;
  onSelect: (year: number, value: number) => void;
  columns: number;
  className?: string;
};

function DateSelectorPeriodGrid({
  years,
  items,
  selectedYear,
  selectedValue,
  rangeStart,
  rangeEnd,
  isInRange,
  onSelect,
  columns,
  className,
}: DateSelectorDateSelectorPeriodGridProps) {
  return (
    <div className={cn('w-full space-y-6', className)}>
      {years.map((year) => (
        <div key={year}>
          <div className="text-muted-foreground mb-3 text-sm font-medium">
            {year}
          </div>
          <div
            className="grid gap-2"
            style={{
              gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
            }}
          >
            {items.map((item, index) => {
              const isSelected =
                selectedYear === year && selectedValue === index;
              const isRangeStart =
                rangeStart?.year === year && rangeStart?.value === index;
              const isRangeEnd =
                rangeEnd?.year === year && rangeEnd?.value === index;
              const inRange = isInRange(year, index);

              return (
                <Button
                  key={item}
                  className={cn(
                    inRange &&
                      !isSelected &&
                      !isRangeStart &&
                      !isRangeEnd &&
                      'bg-accent dark:bg-accent/60',
                  )}
                  size="sm"
                  variant={
                    isSelected || isRangeStart || isRangeEnd
                      ? 'default'
                      : 'outline'
                  }
                  onClick={() => onSelect(year, index)}
                >
                  {item}
                </Button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

type DateSelectorYearListProps = {
  years: number[];
  selectedYear?: number;
  rangeStart?: { year: number; value: number };
  rangeEnd?: { year: number; value: number };
  isYearInRange: (year: number) => boolean;
  onSelect: (year: number) => void;
  className?: string;
};

function DateSelectorYearList({
  years,
  selectedYear,
  rangeStart,
  rangeEnd,
  isYearInRange,
  onSelect,
  className,
}: DateSelectorYearListProps) {
  return (
    <div className={cn('grid grid-cols-2 gap-2', className)}>
      {years.map((year) => {
        const isSelected = selectedYear === year && !rangeStart && !rangeEnd;
        const isRangeStart = rangeStart?.year === year;
        const isRangeEnd = rangeEnd?.year === year;
        const inRange = isYearInRange(year);

        return (
          <Button
            key={year}
            className={cn(
              inRange &&
                !isSelected &&
                !isRangeStart &&
                !isRangeEnd &&
                'bg-accent dark:bg-accent/60',
            )}
            size="sm"
            variant={
              isSelected || isRangeStart || isRangeEnd ? 'default' : 'outline'
            }
            onClick={() => onSelect(year)}
          >
            {year}
          </Button>
        );
      })}
    </div>
  );
}

export type DateSelectorProps = DateSelectorYearOptions & {
  value?: DateSelectorValue;
  onChange?: (value: DateSelectorValue) => void;
  allowRange?: boolean;
  periodTypes?: DateSelectorPeriodType[];
  defaultPeriodType?: DateSelectorPeriodType;
  defaultFilterType?: DateSelectorFilterType;
  presetMode?: DateSelectorFilterType;
  showInput?: boolean;
  showTwoMonths?: boolean;
  label?: string;
  className?: string;
  baseYear?: number;
  i18n?: Partial<DateSelectorI18nConfig>;
  inputHint?: string;
  dayDateFormat?: string;
  dayDateFormats?: string[];
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
};

export function DateSelector({
  value,
  onChange,
  allowRange = true,
  periodTypes,
  defaultPeriodType = 'day',
  defaultFilterType = 'is',
  presetMode,
  showInput = true,
  showTwoMonths = true,
  label,
  className,
  yearRange,
  baseYear,
  minYear,
  maxYear,
  i18n: i18nOverride,
  inputHint,
  dayDateFormat = 'MM/dd/yyyy',
  dayDateFormats,
  weekStartsOn,
}: DateSelectorProps) {
  const shouldUseRange = yearRange !== undefined;
  const resolvedYearRange = shouldUseRange ? yearRange : undefined;
  const resolvedMinYear = shouldUseRange ? undefined : (minYear ?? 2015);
  const resolvedMaxYear = shouldUseRange ? undefined : (maxYear ?? 2026);

  const mergedI18n = useMemo(
    () => ({ ...DEFAULT_DATE_SELECTOR_I18N, ...i18nOverride }),
    [i18nOverride],
  );

  const selector = useDateSelector({
    allowRange,
    baseYear,
    defaultFilterType,
    defaultPeriodType,
    onChange,
    periodTypes,
    presetMode,
    value,
    ...(shouldUseRange
      ? { yearRange: resolvedYearRange }
      : { maxYear: resolvedMaxYear, minYear: resolvedMinYear }),
  });

  const {
    periodType,
    filterType,
    selectedDate,
    selectedEndDate,
    calendarMonth,
    selectedYear,
    selectedMonth,
    selectedQuarter,
    selectedHalfYear,
    rangeStart,
    rangeEnd,
    hoverDate,
    years,
    currentValue,
    setPeriodType,
    setFilterType,
    setCalendarMonth,
    setHoverDate,
    clearSelection,
    handleDayClick,
    handlePeriodSelect,
    handleYearSelect,
    isInRange,
    isYearInRange,
  } = selector;

  const displayValue = formatDateValue(currentValue, mergedI18n, dayDateFormat);
  const [inputValueState, setInputValueState] = useState(displayValue);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const inputValue = isInputFocused ? inputValueState : displayValue;

  // Compute date formats for parsing
  const dateFormats = useMemo(() => {
    if (dayDateFormats && dayDateFormats.length > 0) {
      // Use provided formats, with dayDateFormat first if not already included
      const formats = [...dayDateFormats];
      if (!formats.includes(dayDateFormat)) {
        formats.unshift(dayDateFormat);
      }
      return formats;
    }
    // Default formats: use dayDateFormat first, then common alternatives
    const defaultFormats = [
      dayDateFormat,
      'dd/MM/yyyy',
      'yyyy-MM-dd',
      'MM-dd-yyyy',
      'dd-MM-yyyy',
    ];
    // Remove duplicates while preserving order
    return [...new Set(defaultFormats)];
  }, [dayDateFormat, dayDateFormats]);

  // Parse input text to DateSelectorValue
  const parseInputValue = useCallback(
    (text: string): DateSelectorValue | null => {
      if (!text.trim()) return null;

      const trimmed = text.trim();

      // Try parsing as year (e.g., "2025")
      const yearMatch = /^\d{4}$/.exec(trimmed);
      if (yearMatch) {
        const year = Number.parseInt(yearMatch[0]);
        if (year >= 1900 && year <= 2100) {
          return {
            operator: presetMode ?? filterType,
            period: 'year',
            year,
          };
        }
      }

      // Try parsing as quarter (e.g., "Q4", "Q1 2025")
      const quarterMatch = /^Q([1-4])(?:\s+(\d{4}))?$/i.exec(trimmed);
      if (quarterMatch) {
        const quarter = Number.parseInt(quarterMatch[1]) - 1;
        const year = quarterMatch[2]
          ? Number.parseInt(quarterMatch[2])
          : new Date().getFullYear();
        if (year >= 1900 && year <= 2100) {
          return {
            operator: presetMode ?? filterType,
            period: 'quarter',
            quarter,
            year,
          };
        }
      }

      // Try parsing as date using computed formats
      for (const dateFormat of dateFormats) {
        try {
          const parsed = parse(trimmed, dateFormat, new Date());
          if (!Number.isNaN(parsed.getTime())) {
            return {
              operator: presetMode ?? filterType,
              period: 'day',
              startDate: parsed,
            };
          }
        } catch {
          // Continue to next format
        }
      }

      return null;
    },
    [filterType, presetMode, dateFormats],
  );

  const handleInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setInputValueState(newValue);

      // Try to parse the input
      const parsed = parseInputValue(newValue);
      if (parsed) {
        onChange?.(parsed);
      }
    },
    [onChange, parseInputValue],
  );

  const handleInputBlur = useCallback(() => {
    setIsInputFocused(false);
    // Reset to display value if parsing failed
    if (!parseInputValue(inputValue)) {
      setInputValueState(displayValue);
    }
  }, [inputValue, displayValue, parseInputValue]);

  return (
    <DateSelectorContext.Provider
      value={{ i18n: mergedI18n, size: 'default', variant: 'outline' }}
    >
      <div className={cn('w-full space-y-4 sm:w-117.5', className)}>
        <div className="flex flex-wrap items-center gap-3">
          {label && (
            <h3 className="text-sm font-medium" data-slot="data-selector-label">
              {label}
            </h3>
          )}
          <DateSelectorFilterToggle
            presetMode={presetMode}
            showBetween={allowRange}
            value={filterType}
            onChange={setFilterType}
          />
        </div>
        {showInput && (
          <div className="relative">
            <Input
              placeholder={
                isInputFocused && inputHint ? inputHint : mergedI18n.placeholder
              }
              readOnly={!inputHint}
              type="text"
              value={inputHint ? inputValue : displayValue}
              onBlur={handleInputBlur}
              onChange={handleInputChange}
              onFocus={() => {
                setIsInputFocused(true);
                setInputValueState(displayValue);
              }}
            />
            {(inputHint ? inputValue : displayValue) && (
              <button
                className={cn(
                  // Base Styles
                  'absolute inset-e-2.5 top-1/2 size-4 -translate-y-1/2 cursor-pointer rounded-xs',
                  // Visual States
                  'opacity-70 transition-opacity hover:opacity-100',
                  // Focus States
                  'ring-offset-background focus:ring-ring focus:ring-2 focus:ring-offset-2 focus:outline-none',
                )}
                type="button"
                onClick={clearSelection}
              >
                <Icons.X className="size-4" />
              </button>
            )}
          </div>
        )}
        <DateSelectorPeriodTabs
          calendarMonth={calendarMonth}
          periodTypes={periodTypes}
          showNavigationButtons={periodType === 'day'}
          value={periodType}
          onChange={setPeriodType}
          onMonthChange={setCalendarMonth}
        />

        {periodType === 'day' ? (
          <div className="w-full pb-1">
            <DateSelectorDayPicker
              currentMonth={calendarMonth}
              hoverDate={hoverDate}
              isRange={filterType === 'between' && allowRange}
              selectedDate={selectedDate}
              selectedEndDate={selectedEndDate}
              showTwoMonths={showTwoMonths}
              weekStartsOn={weekStartsOn}
              onDayClick={handleDayClick}
              onDayHover={setHoverDate}
            />
          </div>
        ) : (
          <div className="-mr-3 w-full">
            <ScrollArea key={periodType} className="h-50 w-full pe-3">
              {periodType === 'month' && (
                <DateSelectorPeriodGrid
                  columns={3}
                  isInRange={isInRange}
                  items={mergedI18n.monthsShort}
                  rangeEnd={rangeEnd}
                  rangeStart={rangeStart}
                  selectedValue={selectedMonth}
                  selectedYear={selectedYear}
                  years={years}
                  onSelect={handlePeriodSelect}
                />
              )}

              {periodType === 'quarter' && (
                <DateSelectorPeriodGrid
                  columns={4}
                  isInRange={isInRange}
                  items={mergedI18n.quarters}
                  rangeEnd={rangeEnd}
                  rangeStart={rangeStart}
                  selectedValue={selectedQuarter}
                  selectedYear={selectedYear}
                  years={years}
                  onSelect={handlePeriodSelect}
                />
              )}

              {periodType === 'half-year' && (
                <DateSelectorPeriodGrid
                  columns={2}
                  isInRange={isInRange}
                  items={mergedI18n.halfYears}
                  rangeEnd={rangeEnd}
                  rangeStart={rangeStart}
                  selectedValue={selectedHalfYear}
                  selectedYear={selectedYear}
                  years={years}
                  onSelect={handlePeriodSelect}
                />
              )}

              {periodType === 'year' && (
                <DateSelectorYearList
                  isYearInRange={isYearInRange}
                  rangeEnd={rangeEnd}
                  rangeStart={rangeStart}
                  selectedYear={selectedYear}
                  years={years}
                  onSelect={handleYearSelect}
                />
              )}
            </ScrollArea>
          </div>
        )}
      </div>
    </DateSelectorContext.Provider>
  );
}
