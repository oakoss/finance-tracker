import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import { createContext, use, useCallback, useState } from 'react';

import { cn } from '@/lib/utils';

// Types
type TimelineContextValue = {
  activeStep: number;
  setActiveStep: (step: number) => void;
};

// Context
const TimelineContext = createContext<TimelineContextValue | undefined>(
  undefined,
);

function useTimeline() {
  const context = use(TimelineContext);
  if (!context) {
    throw new Error('useTimeline must be used within a Timeline');
  }
  return context;
}

// Components
type TimelineProps = {
  defaultValue?: number;
  onValueChange?: (value: number) => void;
  orientation?: 'horizontal' | 'vertical';
  value?: number;
} & useRender.ComponentProps<'div'>;

function Timeline({
  children,
  className,
  defaultValue = 1,
  onValueChange,
  orientation = 'vertical',
  render,
  value,
  ...props
}: TimelineProps) {
  const [activeStepState, setActiveStepState] = useState(defaultValue);

  const setActiveStep = useCallback(
    (step: number) => {
      if (value === undefined) {
        setActiveStepState(step);
      }
      onValueChange?.(step);
    },
    [value, onValueChange],
  );

  const currentStep = value ?? activeStepState;

  const defaultProps = {
    children,
    className: cn(
      'group/timeline flex data-[orientation=horizontal]:w-full data-[orientation=horizontal]:flex-row data-[orientation=vertical]:flex-col',
      className,
    ),
    'data-orientation': orientation,
    'data-slot': 'timeline',
  };

  return (
    <TimelineContext value={{ activeStep: currentStep, setActiveStep }}>
      {useRender({
        defaultTagName: 'div',
        props: mergeProps<'div'>(defaultProps, props),
        render,
      })}
    </TimelineContext>
  );
}

// TimelineContent
function TimelineContent({
  children,
  className,
  render,
  ...props
}: useRender.ComponentProps<'div'>) {
  const defaultProps = {
    children,
    className: cn('text-sm text-muted-foreground', className),
    'data-slot': 'timeline-content',
  };

  return useRender({
    defaultTagName: 'div',
    props: mergeProps<'div'>(defaultProps, props),
    render,
  });
}

// TimelineDate
type TimelineDateProps = useRender.ComponentProps<'time'>;

function TimelineDate({
  children,
  className,
  render,
  ...props
}: TimelineDateProps) {
  const defaultProps = {
    children,
    className: cn(
      'mb-1 block text-xs font-medium text-muted-foreground group-data-[orientation=vertical]/timeline:max-sm:h-4',
      className,
    ),
    'data-slot': 'timeline-date',
  };

  return useRender({
    defaultTagName: 'time',
    props: mergeProps<'time'>(defaultProps, props),
    render,
  });
}

// TimelineHeader
function TimelineHeader({
  children,
  className,
  render,
  ...props
}: useRender.ComponentProps<'div'>) {
  const defaultProps = {
    children,
    className: cn(className),
    'data-slot': 'timeline-header',
  };

  return useRender({
    defaultTagName: 'div',
    props: mergeProps<'div'>(defaultProps, props),
    render,
  });
}

// TimelineIndicator
type TimelineIndicatorProps = useRender.ComponentProps<'div'>;

function TimelineIndicator({
  children,
  className,
  render,
  ...props
}: TimelineIndicatorProps) {
  const defaultProps = {
    'aria-hidden': true,
    children,
    className: cn(
      'absolute size-4 rounded-full border-2 border-primary/20 group-data-completed/timeline-item:border-primary group-data-[orientation=horizontal]/timeline:-top-6 group-data-[orientation=horizontal]/timeline:left-0 group-data-[orientation=horizontal]/timeline:-translate-y-1/2 group-data-[orientation=vertical]/timeline:top-0 group-data-[orientation=vertical]/timeline:-left-6 group-data-[orientation=vertical]/timeline:-translate-x-1/2',
      className,
    ),
    'data-slot': 'timeline-indicator',
  };

  return useRender({
    defaultTagName: 'div',
    props: mergeProps<'div'>(defaultProps, props),
    render,
  });
}

// TimelineItem
type TimelineItemProps = { step: number } & useRender.ComponentProps<'div'>;

function TimelineItem({
  children,
  className,
  render,
  step,
  ...props
}: TimelineItemProps) {
  const { activeStep } = useTimeline();

  const defaultProps = {
    children,
    className: cn(
      'group/timeline-item relative flex flex-1 flex-col gap-0.5 group-data-[orientation=horizontal]/timeline:mt-8 group-data-[orientation=horizontal]/timeline:not-last:pe-8 group-data-[orientation=vertical]/timeline:ms-8 group-data-[orientation=vertical]/timeline:not-last:pb-6 has-[+[data-completed]]:**:data-[slot=timeline-separator]:bg-primary',
      className,
    ),
    'data-completed': step <= activeStep ? true : undefined,
    'data-slot': 'timeline-item',
  };

  return useRender({
    defaultTagName: 'div',
    props: mergeProps<'div'>(defaultProps, props),
    render,
  });
}

// TimelineSeparator
function TimelineSeparator({
  children,
  className,
  render,
  ...props
}: useRender.ComponentProps<'div'>) {
  const defaultProps = {
    'aria-hidden': true,
    children,
    className: cn(
      'absolute self-start bg-primary/10 group-last/timeline-item:hidden group-data-[orientation=horizontal]/timeline:-top-6 group-data-[orientation=horizontal]/timeline:h-0.5 group-data-[orientation=horizontal]/timeline:w-[calc(100%-1rem-0.25rem)] group-data-[orientation=horizontal]/timeline:translate-x-4.5 group-data-[orientation=horizontal]/timeline:-translate-y-1/2 group-data-[orientation=vertical]/timeline:-left-6 group-data-[orientation=vertical]/timeline:h-[calc(100%-1rem-0.25rem)] group-data-[orientation=vertical]/timeline:w-0.5 group-data-[orientation=vertical]/timeline:-translate-x-1/2 group-data-[orientation=vertical]/timeline:translate-y-4.5',
      className,
    ),
    'data-slot': 'timeline-separator',
  };

  return useRender({
    defaultTagName: 'div',
    props: mergeProps<'div'>(defaultProps, props),
    render,
  });
}

// TimelineTitle
function TimelineTitle({
  children,
  className,
  render,
  ...props
}: useRender.ComponentProps<'h3'>) {
  const defaultProps = {
    children,
    className: cn('text-sm font-medium', className),
    'data-slot': 'timeline-title',
  };

  return useRender({
    defaultTagName: 'h3',
    props: mergeProps<'h3'>(defaultProps, props),
    render,
  });
}

export {
  Timeline,
  TimelineContent,
  TimelineDate,
  TimelineHeader,
  TimelineIndicator,
  TimelineItem,
  TimelineSeparator,
  TimelineTitle,
};
