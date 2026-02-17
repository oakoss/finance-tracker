import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import {
  defaultDropAnimationSideEffects,
  DndContext,
  type DragEndEvent,
  type DraggableSyntheticListeners,
  DragOverlay,
  type DragStartEvent,
  type DropAnimation,
  KeyboardSensor,
  MeasuringStrategy,
  type Modifiers,
  PointerSensor,
  type UniqueIdentifier,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  type AnimateLayoutChanges,
  arrayMove,
  defaultAnimateLayoutChanges,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import * as React from 'react';
import {
  createContext,
  type CSSProperties,
  isValidElement,
  type ReactElement,
  type ReactNode,
  use,
  useCallback,
  useMemo,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

import { cn } from '@/lib/utils';

// Sortable Item Context
const SortableItemContext = createContext<{
  listeners: DraggableSyntheticListeners | undefined;
  isDragging?: boolean;
  disabled?: boolean;
}>({
  disabled: false,
  isDragging: false,
  listeners: undefined,
});

const IsOverlayContext = createContext(false);

const SortableInternalContext = createContext<{
  activeId: UniqueIdentifier | null;
  modifiers?: Modifiers;
}>({
  activeId: null,
  modifiers: undefined,
});

const animateLayoutChanges: AnimateLayoutChanges = (args) =>
  defaultAnimateLayoutChanges({ ...args, wasDragging: true });

const dropAnimationConfig: DropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: {
      active: {
        opacity: '0.4',
      },
    },
  }),
};

// Multipurpose Sortable Component
export type SortableRootProps<T> = {
  value: T[];
  onValueChange: (value: T[]) => void;
  getItemValue: (item: T) => string;
  children: ReactNode;
  onMove?: (event: {
    event: DragEndEvent;
    activeIndex: number;
    overIndex: number;
  }) => void;
  strategy?: 'horizontal' | 'vertical' | 'grid';
  onDragStart?: (event: DragStartEvent) => void;
  onDragEnd?: (event: DragEndEvent) => void;
  modifiers?: Modifiers;
} & Omit<
  useRender.ComponentProps<'div'>,
  'onDragStart' | 'onDragEnd' | 'children'
>;

function Sortable<T>({
  value,
  onValueChange,
  getItemValue,
  className,
  render,
  onMove,
  strategy = 'vertical',
  onDragStart,
  onDragEnd,
  modifiers,
  children,
  ...props
}: SortableRootProps<T>) {
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const isClient = typeof document !== 'undefined';

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 10,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      setActiveId(event.active.id);
      onDragStart?.(event);
    },
    [onDragStart],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);
      onDragEnd?.(event);

      if (!over) return;

      // Handle item reordering
      const activeIndex = value.findIndex(
        (item: T) => getItemValue(item) === active.id,
      );
      const overIndex = value.findIndex(
        (item: T) => getItemValue(item) === over.id,
      );

      if (activeIndex !== overIndex) {
        if (onMove) {
          onMove({ activeIndex, event, overIndex });
        } else {
          const newValue = arrayMove(value, activeIndex, overIndex);
          onValueChange(newValue);
        }
      }
    },
    [value, getItemValue, onValueChange, onMove, onDragEnd],
  );

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
  }, []);

  function getStrategy() {
    if (strategy === 'vertical') {
      return verticalListSortingStrategy;
    }

    return rectSortingStrategy;
  }

  const itemIds = useMemo(
    () => value.map((item) => getItemValue(item)),
    [value, getItemValue],
  );

  const contextValue = useMemo(
    () => ({ activeId, modifiers }),
    [activeId, modifiers],
  );

  const defaultProps = {
    children,
    className: cn(activeId !== null && 'cursor-grabbing!', className),
    'data-dragging': activeId !== null,
    'data-slot': 'sortable',
  };

  // Find the active child for the overlay
  const overlayContent = useMemo(() => {
    if (!activeId) return null;

    const childArray = Array.isArray(children)
      ? children
      : children
        ? [children]
        : [];
    const matched = childArray.find((child) => {
      return (
        isValidElement(child) &&
        (child.props as { value?: UniqueIdentifier }).value === activeId
      );
    });

    if (!matched || !isValidElement(matched)) return null;

    const matchedElement = matched as ReactElement<{ className?: string }>;

    return React.createElement(matchedElement.type, {
      ...(matchedElement.props as Record<string, unknown>),
      className: cn(matchedElement.props.className, 'z-50 shadow-lg'),
    });
  }, [activeId, children]);

  return (
    <SortableInternalContext.Provider value={contextValue}>
      <DndContext
        measuring={{
          droppable: {
            strategy: MeasuringStrategy.Always,
          },
        }}
        modifiers={modifiers}
        sensors={sensors}
        onDragCancel={handleDragCancel}
        onDragEnd={handleDragEnd}
        onDragStart={handleDragStart}
      >
        <SortableContext items={itemIds} strategy={getStrategy()}>
          {useRender({
            defaultTagName: 'div',
            props: mergeProps<'div'>(defaultProps, props),
            render,
          })}
        </SortableContext>
        {isClient &&
          createPortal(
            <DragOverlay
              className={cn('z-50', activeId && 'cursor-grabbing')}
              dropAnimation={dropAnimationConfig}
              modifiers={modifiers}
            >
              <IsOverlayContext.Provider value={true}>
                {overlayContent}
              </IsOverlayContext.Provider>
            </DragOverlay>,
            document.body,
          )}
      </DndContext>
    </SortableInternalContext.Provider>
  );
}

export type SortableItemProps = {
  value: string;
  disabled?: boolean;
} & useRender.ComponentProps<'div'>;

function SortableItem({
  value,
  className,
  render,
  disabled,
  ...props
}: SortableItemProps) {
  const isOverlay = use(IsOverlayContext);

  const {
    setNodeRef,
    transform,
    transition,
    attributes,
    listeners,
    isDragging: isSortableDragging,
  } = useSortable({
    animateLayoutChanges,
    disabled: Boolean(disabled) || isOverlay,
    id: value,
  });

  const isDragging = isOverlay ? true : isSortableDragging;
  const style = isOverlay
    ? undefined
    : ({
        transition,
        transform: CSS.Transform.toString(transform),
      } as CSSProperties);

  const baseProps = {
    children: props.children,
    className: cn(
      isDragging && 'opacity-50 z-50',
      disabled && 'opacity-50',
      className,
    ),
    'data-disabled': disabled,
    'data-dragging': isDragging,
    'data-slot': 'sortable-item',
    'data-value': value,
  };

  const defaultProps = isOverlay
    ? baseProps
    : {
        ...baseProps,
        ref: setNodeRef,
        style,
        ...attributes,
      };

  return (
    <SortableItemContext.Provider
      value={{
        disabled,
        isDragging,
        listeners: isOverlay ? undefined : listeners,
      }}
    >
      {useRender({
        defaultTagName: 'div',
        props: mergeProps<'div'>(defaultProps, props),
        render,
      })}
    </SortableItemContext.Provider>
  );
}

export type SortableItemHandleProps = {
  cursor?: boolean;
} & useRender.ComponentProps<'div'>;

function SortableItemHandle({
  className,
  render,
  cursor = true,
  ...props
}: SortableItemHandleProps) {
  const { listeners, isDragging, disabled } = use(SortableItemContext);

  const defaultProps = {
    'data-disabled': disabled,
    'data-dragging': isDragging,
    'data-slot': 'sortable-item-handle',
    ...listeners,
    children: props.children,
    className: cn(
      cursor && (isDragging ? 'cursor-grabbing!' : 'cursor-grab!'),
      className,
    ),
  };

  return useRender({
    defaultTagName: 'div',
    props: mergeProps<'div'>(defaultProps, props),
    render,
  });
}

export type SortableOverlayProps = {
  children?: ReactNode | ((params: { value: UniqueIdentifier }) => ReactNode);
} & Omit<React.ComponentProps<typeof DragOverlay>, 'children'>;

function SortableOverlay({
  children,
  className,
  ...props
}: SortableOverlayProps) {
  const { activeId, modifiers } = use(SortableInternalContext);
  const isClient = typeof document !== 'undefined';

  const content =
    activeId && children
      ? typeof children === 'function'
        ? children({ value: activeId })
        : children
      : null;

  if (!isClient) return null;

  return createPortal(
    <DragOverlay
      className={cn('z-50', activeId && 'cursor-grabbing', className)}
      dropAnimation={dropAnimationConfig}
      modifiers={modifiers}
      {...props}
    >
      <IsOverlayContext.Provider value={true}>
        {content}
      </IsOverlayContext.Provider>
    </DragOverlay>,
    document.body,
  );
}

export { Sortable, SortableItem, SortableItemHandle, SortableOverlay };
