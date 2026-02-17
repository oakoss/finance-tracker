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
  setActiveStep: (step: number) => void;
  stepsCount: number;
  orientation: StepperOrientation;
  registerTrigger: (node: HTMLButtonElement, action?: 'add' | 'remove') => void;
  triggerNodes: HTMLButtonElement[];
  focusNext: (currentIdx: number) => void;
  focusPrev: (currentIdx: number) => void;
  focusFirst: () => void;
  focusLast: () => void;
  indicators: StepIndicators;
};

type StepItemContextValue = {
  step: number;
  state: StepState;
  isDisabled: boolean;
  isLoading: boolean;
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
  value?: number;
  onValueChange?: (value: number) => void;
  orientation?: StepperOrientation;
  indicators?: StepIndicators;
} & HTMLAttributes<HTMLDivElement>;

function Stepper({
  defaultValue = 1,
  value,
  onValueChange,
  orientation = 'horizontal',
  className,
  children,
  indicators = {},
  ...props
}: StepperProps) {
  const [activeStep, setActiveStep] = useState(defaultValue);
  const [triggerNodes, setTriggerNodes] = useState<HTMLButtonElement[]>([]);

  const childArray = Array.isArray(children)
    ? children
    : children
      ? [children]
      : [];
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
    <StepperContext.Provider value={contextValue}>
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
    </StepperContext.Provider>
  );
}

type StepperItemProps = {
  step: number;
  completed?: boolean;
  disabled?: boolean;
  loading?: boolean;
} & React.HTMLAttributes<HTMLDivElement>;

function StepperItem({
  step,
  completed = false,
  disabled = false,
  loading = false,
  className,
  children,
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
    <StepItemContext.Provider
      value={{ isDisabled: disabled, isLoading, state, step }}
    >
      <div
        className={cn(
          'group/step flex items-center justify-center not-last:flex-1 group-data-[orientation=horizontal]/stepper-nav:flex-row group-data-[orientation=vertical]/stepper-nav:flex-col',
          className,
        )}
        data-slot="stepper-item"
        data-state={state}
        {...(isLoading ? { 'data-loading': true } : {})}
        {...props}
      >
        {children}
      </div>
    </StepItemContext.Provider>
  );
}

type StepperTriggerProps = {
  asChild?: boolean;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

function StepperTrigger({
  asChild = false,
  className,
  children,
  tabIndex,
  ...props
}: StepperTriggerProps) {
  const { state, isLoading } = useStepItem();
  const stepperCtx = useStepper();
  const {
    setActiveStep,
    activeStep,
    registerTrigger,
    triggerNodes,
    focusNext,
    focusPrev,
    focusFirst,
    focusLast,
  } = stepperCtx;
  const { step, isDisabled } = useStepItem();
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
        'focus-visible:border-ring focus-visible:ring-ring/50 inline-flex cursor-pointer items-center outline-none focus-visible:z-10 focus-visible:ring-3 disabled:pointer-events-none disabled:opacity-60',
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
  const { state, isLoading } = useStepItem();
  const { indicators } = useStepper();

  return (
    <div
      className={cn(
        'border-background bg-accent text-accent-foreground data-[state=completed]:bg-primary data-[state=completed]:text-primary-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground relative flex size-6 shrink-0 items-center justify-center overflow-hidden',
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
        'bg-muted rounded-full group-data-[orientation=horizontal]/stepper-nav:h-0.5 group-data-[orientation=vertical]/stepper-nav:h-12 group-data-[orientation=vertical]/stepper-nav:w-0.5 m-0.5 group-data-[orientation=horizontal]/stepper-nav:flex-1',
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
      className={cn('text-muted-foreground text-sm', className)}
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
  value: number;
  forceMount?: boolean;
} & React.ComponentProps<'div'>;

function StepperContent({
  value,
  forceMount,
  children,
  className,
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
