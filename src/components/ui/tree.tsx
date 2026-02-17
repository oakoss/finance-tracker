'use client';

import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import { type ItemInstance } from '@headless-tree/core';
import { ChevronDownIcon, MinusIcon, PlusIcon } from 'lucide-react';
import { createContext, use } from 'react';

import { cn } from '@/lib/utils';

type ToggleIconType = 'chevron' | 'plus-minus';

type TreeLike = {
  getContainerProps?: () => React.HTMLAttributes<HTMLDivElement>;
  getDragLineStyle?: () => React.CSSProperties;
};

type TreeContextValue<T = any> = {
  indent: number;
  currentItem?: ItemInstance<T>;
  tree?: TreeLike;
  toggleIconType?: ToggleIconType;
};

const TreeContext = createContext<TreeContextValue>({
  currentItem: undefined,
  indent: 20,
  toggleIconType: 'plus-minus',
  tree: undefined,
});

function useTreeContext<T = any>() {
  return use(TreeContext) as TreeContextValue<T>;
}

type TreeProps = {
  indent?: number;
  tree?: TreeLike;
  toggleIconType?: ToggleIconType;
} & React.HTMLAttributes<HTMLDivElement>;

function Tree({
  indent = 20,
  tree,
  className,
  toggleIconType = 'chevron',
  ...props
}: TreeProps) {
  const containerProps =
    tree && typeof tree.getContainerProps === 'function'
      ? tree.getContainerProps()
      : {};
  const mergedProps = { ...props, ...containerProps };

  // Extract style from mergedProps to merge with our custom styles
  const { style: propStyle, ...otherProps } = mergedProps;

  // Merge styles
  const mergedStyle = {
    ...propStyle,
    '--tree-indent': `${indent}px`,
  } as React.CSSProperties;

  return (
    <TreeContext.Provider value={{ indent, toggleIconType, tree }}>
      <div
        className={cn('flex flex-col', className)}
        data-slot="tree"
        style={mergedStyle}
        {...otherProps}
      />
    </TreeContext.Provider>
  );
}

type TreeItemProps<T = any> = {
  item: ItemInstance<T>;
  indent?: number;
} & Omit<useRender.ComponentProps<'button'>, 'indent'>;

function TreeItem<T = any>({
  item,
  className,
  render,
  children,
  ...props
}: TreeItemProps<T>) {
  const parentContext = useTreeContext<T>();
  const { indent } = parentContext;

  const itemProps = typeof item.getProps === 'function' ? item.getProps() : {};
  const mergedProps = { ...props, children, ...itemProps };

  // Extract style from mergedProps to merge with our custom styles
  const { style: propStyle, ...otherProps } = mergedProps;

  // Merge styles
  const mergedStyle = {
    ...propStyle,
    '--tree-padding': `${item.getItemMeta().level * indent}px`,
  } as React.CSSProperties;

  const defaultProps = {
    'aria-expanded': item.isExpanded(),
    className: cn(
      'z-10 ps-(--tree-padding) outline-hidden select-none not-last:pb-0.5 focus:z-20 data-disabled:pointer-events-none data-disabled:opacity-50',
      className,
    ),
    'data-drag-target':
      typeof item.isDragTarget === 'function'
        ? (item.isDragTarget() ?? false)
        : undefined,
    'data-focus':
      typeof item.isFocused === 'function'
        ? (item.isFocused() ?? false)
        : undefined,
    'data-folder':
      typeof item.isFolder === 'function'
        ? (item.isFolder() ?? false)
        : undefined,
    'data-search-match':
      typeof item.isMatchingSearch === 'function'
        ? (item.isMatchingSearch() ?? false)
        : undefined,
    'data-selected':
      typeof item.isSelected === 'function'
        ? (item.isSelected() ?? false)
        : undefined,
    'data-slot': 'tree-item',
    style: mergedStyle,
  };

  return (
    <TreeContext.Provider value={{ ...parentContext, currentItem: item }}>
      {useRender({
        defaultTagName: 'button',
        props: mergeProps<'button'>(defaultProps, otherProps),
        render,
      })}
    </TreeContext.Provider>
  );
}

type TreeItemLabelProps<T = any> = {
  item?: ItemInstance<T>;
} & React.HTMLAttributes<HTMLSpanElement>;

function TreeItemLabel<T = any>({
  item: propItem,
  children,
  className,
  ...props
}: TreeItemLabelProps<T>) {
  const { currentItem, toggleIconType } = useTreeContext<T>();
  const item = propItem ?? currentItem;

  if (!item) {
    // eslint-disable-next-line no-console
    console.warn('TreeItemLabel: No item provided via props or context');
    return null;
  }

  return (
    <span
      className={cn(
        'in-focus-visible:ring-ring/50 bg-background hover:bg-accent in-data-[selected=true]:bg-accent in-data-[selected=true]:text-accent-foreground in-data-[drag-target=true]:bg-accent flex items-center gap-1 transition-colors not-in-data-[folder=true]:ps-7 in-focus-visible:ring-[3px] in-data-[search-match=true]:bg-blue-50! [&_svg]:pointer-events-none [&_svg]:shrink-0',
        'rounded-sm',
        'py-1.5',
        'px-2',
        'text-sm',
        className,
      )}
      data-slot="tree-item-label"
      {...props}
    >
      {item.isFolder() &&
        (toggleIconType === 'plus-minus' ? (
          item.isExpanded() ? (
            <MinusIcon
              className="text-muted-foreground size-3.5"
              stroke="currentColor"
              strokeWidth="1"
            />
          ) : (
            <PlusIcon
              className="text-muted-foreground size-3.5"
              stroke="currentColor"
              strokeWidth="1"
            />
          )
        ) : (
          <ChevronDownIcon className="text-muted-foreground size-4 in-aria-[expanded=false]:-rotate-90" />
        ))}
      {children ??
        (typeof item.getItemName === 'function' ? item.getItemName() : null)}
    </span>
  );
}

function TreeDragLine({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const { tree } = useTreeContext();

  if (!tree || typeof tree.getDragLineStyle !== 'function') {
    // eslint-disable-next-line no-console
    console.warn(
      'TreeDragLine: No tree provided via context or tree does not have getDragLineStyle method',
    );
    return null;
  }

  const dragLine = tree.getDragLineStyle();
  return (
    <div
      className={cn(
        'bg-primary before:bg-background before:border-primary absolute z-30 -mt-px h-0.5 w-[unset] before:absolute before:-top-0.75 before:left-0 before:size-2 before:border-2',
        'before:rounded-full',
        className,
      )}
      style={dragLine}
      {...props}
    />
  );
}

export { Tree, TreeDragLine, TreeItem, TreeItemLabel };
