'use client';

import {
  createContext,
  type HTMLAttributes,
  isValidElement,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { cn } from '@/lib/utils';

// Types
type StepperOrientation = 'horizontal' | 'vertical';
type StepState = 'active' | 'completed' | 'inactive' | 'loading';
type StepIndicators = {
  active?: React.ReactNode;
  completed?: React.ReactNode;
  inactive?: React.ReactNode;
  loading?: React.ReactNode;
};

function clampStep(step: number, stepsCount: number, fallback: number) {
  if (!Number.isFinite(step)) return fallback;
  if (stepsCount <= 0) return fallback;
  return Math.min(Math.max(step, 1), stepsCount);
}

type StepperContextValue = {
  activeStep: number;
  focusFirst: () => void;
  focusLast: () => void;
  focusNext: (currentIdx: number) => void;
  focusPrev: (currentIdx: number) => void;
  indicators: StepIndicators;
  orientation: StepperOrientation;
  registerTrigger: (node: HTMLButtonElement, action?: 'add' | 'remove') => void;
  setActiveStep: (step: number) => void;
  stepsCount: number;
  triggerNodes: HTMLButtonElement[];
};

type StepItemContextValue = {
  isDisabled: boolean;
  isLoading: boolean;
  state: StepState;
  step: number;
};

const StepperContext = createContext<StepperContextValue | undefined>(
  undefined,
);
const StepItemContext = createContext<StepItemContextValue | undefined>(
  undefined,
);

function useStepper() {
  const ctx = use(StepperContext);
  if (!ctx) throw new Error('useStepper must be used within a Stepper');
  return ctx;
}

function useStepItem() {
  const ctx = use(StepItemContext);
  if (!ctx) throw new Error('useStepItem must be used within a StepperItem');
  return ctx;
}

type StepperProps = {
  defaultValue?: number;
  indicators?: StepIndicators;
  onValueChange?: (value: number) => void;
  orientation?: StepperOrientation;
  value?: number;
} & HTMLAttributes<HTMLDivElement>;

function Stepper({
  children,
  className,
  defaultValue = 1,
  indicators = {},
  onValueChange,
  orientation = 'horizontal',
  value,
  ...props
}: StepperProps) {
  const [activeStep, setActiveStep] = useState(defaultValue);
  const [triggerNodes, setTriggerNodes] = useState<HTMLButtonElement[]>([]);

  const childArray = (() => {
    if (Array.isArray(children)) return children;
    if (children) return [children];
    return [];
  })();
  const stepsCount = childArray.filter((child) => {
    return (
      isValidElement(child) &&
      (child.type as { displayName?: string }).displayName === 'StepperItem'
    );
  }).length;

  // Register/unregister triggers
  const registerTrigger = useCallback(
    (node: HTMLButtonElement, action: 'add' | 'remove' = 'add') => {
      setTriggerNodes((prev) => {
        if (action === 'add') {
          return prev.includes(node) ? prev : [...prev, node];
        }

        return prev.filter((n) => n !== node);
      });
    },
    [],
  );

  const handleSetActiveStep = useCallback(
    (step: number) => {
      const nextStep = clampStep(step, stepsCount, activeStep);
      if (value === undefined) {
        setActiveStep(nextStep);
      }
      onValueChange?.(nextStep);
    },
    [value, onValueChange, stepsCount, activeStep],
  );

  const currentStep = clampStep(value ?? activeStep, stepsCount, 1);

  // Keyboard navigation logic
  function focusTrigger(idx: number) {
    triggerNodes[idx]?.focus();
  }

  function focusNext(currentIdx: number) {
    focusTrigger((currentIdx + 1) % triggerNodes.length);
  }

  function focusPrev(currentIdx: number) {
    focusTrigger((currentIdx - 1 + triggerNodes.length) % triggerNodes.length);
  }

  function focusFirst() {
    focusTrigger(0);
  }

  function focusLast() {
    focusTrigger(triggerNodes.length - 1);
  }

  const contextValue: StepperContextValue = {
    activeStep: currentStep,
    focusFirst,
    focusLast,
    focusNext,
    focusPrev,
    indicators,
    orientation,
    registerTrigger,
    setActiveStep: handleSetActiveStep,
    stepsCount,
    triggerNodes,
  };

  return (
    <StepperContext value={contextValue}>
      <div
        aria-orientation={orientation}
        className={cn('w-full', className)}
        data-orientation={orientation}
        data-slot="stepper"
        role="tablist"
        {...props}
      >
        {children}
      </div>
    </StepperContext>
  );
}

type StepperItemProps = {
  completed?: boolean;
  disabled?: boolean;
  loading?: boolean;
  step: number;
} & React.HTMLAttributes<HTMLDivElement>;

function StepperItem({
  children,
  className,
  completed = false,
  disabled = false,
  loading = false,
  step,
  ...props
}: StepperItemProps) {
  const { activeStep } = useStepper();

  const state: StepState =
    completed || step < activeStep
      ? 'completed'
      : activeStep === step
        ? 'active'
        : 'inactive';

  const isLoading = loading && step === activeStep;

  return (
    <StepItemContext value={{ isDisabled: disabled, isLoading, state, step }}>
      <div
        className={cn(
          'group/step flex items-center justify-center gap-2 not-last:flex-1 group-data-[orientation=horizontal]/stepper-nav:flex-row group-data-[orientation=vertical]/stepper-nav:flex-col',
          className,
        )}
        data-slot="stepper-item"
        data-state={state}
        {...(isLoading ? { 'data-loading': true } : {})}
        {...props}
      >
        {children}
      </div>
    </StepItemContext>
  );
}

type StepperTriggerProps = {
  asChild?: boolean;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

function StepperTrigger({
  asChild = false,
  children,
  className,
  tabIndex,
  ...props
}: StepperTriggerProps) {
  const { isLoading, state } = useStepItem();
  const stepperCtx = useStepper();
  const {
    activeStep,
    focusFirst,
    focusLast,
    focusNext,
    focusPrev,
    registerTrigger,
    setActiveStep,
    triggerNodes,
  } = stepperCtx;
  const { isDisabled, step } = useStepItem();
  const isSelected = activeStep === step;
  const id = `stepper-tab-${step}`;
  const panelId = `stepper-panel-${step}`;

  // Register this trigger for keyboard navigation
  const btnRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const node = btnRef.current;
    if (!node) return;

    registerTrigger(node);
    return () => registerTrigger(node, 'remove');
  }, [registerTrigger]);

  // Find our index among triggers for navigation
  const myIdx = useMemo(
    () => triggerNodes.findIndex((node) => node.dataset.step === String(step)),
    [triggerNodes, step],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown': {
        e.preventDefault();
        if (myIdx !== -1 && focusNext) focusNext(myIdx);
        break;
      }
      case 'ArrowLeft':
      case 'ArrowUp': {
        e.preventDefault();
        if (myIdx !== -1 && focusPrev) focusPrev(myIdx);
        break;
      }
      case 'Home': {
        e.preventDefault();
        if (focusFirst) focusFirst();
        break;
      }
      case 'End': {
        e.preventDefault();
        if (focusLast) focusLast();
        break;
      }
      case 'Enter':
      case ' ': {
        e.preventDefault();
        setActiveStep(step);
        break;
      }
    }
  };

  if (asChild) {
    return (
      <span
        className={className}
        data-slot="stepper-trigger"
        data-state={state}
      >
        {children}
      </span>
    );
  }

  return (
    <button
      ref={btnRef}
      aria-controls={panelId}
      aria-selected={isSelected}
      className={cn(
        'inline-flex cursor-pointer items-center outline-none focus-visible:z-10 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-60',
        'gap-3 rounded-full',
        className,
      )}
      data-loading={isLoading}
      data-slot="stepper-trigger"
      data-state={state}
      data-step={step}
      disabled={isDisabled}
      id={id}
      role="tab"
      tabIndex={typeof tabIndex === 'number' ? tabIndex : isSelected ? 0 : -1}
      onClick={() => setActiveStep(step)}
      onKeyDown={handleKeyDown}
      {...props}
    >
      {children}
    </button>
  );
}

function StepperIndicator({
  children,
  className,
}: React.ComponentProps<'div'>) {
  const { isLoading, state } = useStepItem();
  const { indicators } = useStepper();

  return (
    <div
      className={cn(
        'relative flex size-6 shrink-0 items-center justify-center overflow-hidden border-background bg-accent text-accent-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=completed]:bg-primary data-[state=completed]:text-primary-foreground',
        'rounded-full text-xs',
        className,
      )}
      data-slot="stepper-indicator"
      data-state={state}
    >
      <div className="absolute">
        {indicators &&
        ((isLoading && indicators.loading) ||
          (state === 'completed' && indicators.completed) ||
          (state === 'active' && indicators.active) ||
          (state === 'inactive' && indicators.inactive))
          ? ((isLoading && indicators.loading) ??
            (state === 'completed' && indicators.completed) ??
            (state === 'active' && indicators.active) ??
            (state === 'inactive' && indicators.inactive))
          : children}
      </div>
    </div>
  );
}

function StepperSeparator({ className }: React.ComponentProps<'div'>) {
  const { state } = useStepItem();

  return (
    <div
      className={cn(
        'm-0.5 rounded-full bg-muted group-data-[orientation=horizontal]/stepper-nav:h-0.5 group-data-[orientation=horizontal]/stepper-nav:flex-1 group-data-[orientation=vertical]/stepper-nav:h-12 group-data-[orientation=vertical]/stepper-nav:w-0.5',
        className,
      )}
      data-slot="stepper-separator"
      data-state={state}
    />
  );
}

function StepperTitle({ children, className }: React.ComponentProps<'h3'>) {
  const { state } = useStepItem();

  return (
    <h3
      className={cn('text-sm leading-none font-medium', className)}
      data-slot="stepper-title"
      data-state={state}
    >
      {children}
    </h3>
  );
}

function StepperDescription({
  children,
  className,
}: React.ComponentProps<'div'>) {
  const { state } = useStepItem();

  return (
    <div
      className={cn('text-sm text-muted-foreground', className)}
      data-slot="stepper-description"
      data-state={state}
    >
      {children}
    </div>
  );
}

function StepperNav({ children, className }: React.ComponentProps<'nav'>) {
  const { activeStep, orientation } = useStepper();

  return (
    <nav
      className={cn(
        'group/stepper-nav inline-flex data-[orientation=horizontal]:w-full data-[orientation=horizontal]:flex-row data-[orientation=vertical]:flex-col',
        className,
      )}
      data-orientation={orientation}
      data-slot="stepper-nav"
      data-state={activeStep}
    >
      {children}
    </nav>
  );
}

function StepperPanel({ children, className }: React.ComponentProps<'div'>) {
  const { activeStep } = useStepper();

  return (
    <div
      className={cn('w-full', className)}
      data-slot="stepper-panel"
      data-state={activeStep}
    >
      {children}
    </div>
  );
}

type StepperContentProps = {
  forceMount?: boolean;
  value: number;
} & React.ComponentProps<'div'>;

function StepperContent({
  children,
  className,
  forceMount,
  value,
}: StepperContentProps) {
  const { activeStep } = useStepper();
  const isActive = value === activeStep;

  if (!forceMount && !isActive) {
    return null;
  }

  return (
    <div
      className={cn('w-full', className, !isActive && forceMount && 'hidden')}
      data-slot="stepper-content"
      data-state={activeStep}
      hidden={!isActive && forceMount}
    >
      {children}
    </div>
  );
}

export {
  Stepper,
  StepperContent,
  type StepperContentProps,
  StepperDescription,
  StepperIndicator,
  StepperItem,
  type StepperItemProps,
  StepperNav,
  StepperPanel,
  type StepperProps,
  StepperSeparator,
  StepperTitle,
  StepperTrigger,
  type StepperTriggerProps,
  useStepItem,
  useStepper,
};
