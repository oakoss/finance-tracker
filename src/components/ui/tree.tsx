'use client';

import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import { type ItemInstance } from '@headless-tree/core';
import { createContext, use } from 'react';

import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';

type ToggleIconType = 'chevron' | 'plus-minus';

type TreeLike = {
  getContainerProps?: () => React.HTMLAttributes<HTMLDivElement>;
  getDragLineStyle?: () => React.CSSProperties;
};

type TreeContextValue<T = any> = {
  currentItem?: ItemInstance<T> | undefined;
  indent: number;
  toggleIconType?: ToggleIconType;
  tree?: TreeLike | undefined;
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
  toggleIconType?: ToggleIconType;
  tree?: TreeLike;
} & React.HTMLAttributes<HTMLDivElement>;

function Tree({
  className,
  indent = 20,
  toggleIconType = 'chevron',
  tree,
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
    <TreeContext value={{ indent, toggleIconType, tree }}>
      <div
        className={cn('flex flex-col', className)}
        data-slot="tree"
        style={mergedStyle}
        {...otherProps}
      />
    </TreeContext>
  );
}

type TreeItemProps<T = any> = {
  indent?: number;
  item: ItemInstance<T>;
} & Omit<useRender.ComponentProps<'button'>, 'indent'>;

function TreeItem<T = any>({
  children,
  className,
  item,
  render,
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
    <TreeContext value={{ ...parentContext, currentItem: item }}>
      {useRender({
        defaultTagName: 'button',
        props: mergeProps<'button'>(defaultProps, otherProps),
        render,
      })}
    </TreeContext>
  );
}

type TreeItemLabelProps<T = any> = {
  item?: ItemInstance<T>;
} & React.HTMLAttributes<HTMLSpanElement>;

function TreeItemLabel<T = any>({
  children,
  className,
  item: propItem,
  ...props
}: TreeItemLabelProps<T>) {
  const { currentItem, toggleIconType } = useTreeContext<T>();
  const item = propItem ?? currentItem;

  if (!item) {
    // eslint-disable-next-line @eslint-react/purity -- dev-only guard
    console.warn('TreeItemLabel: No item provided via props or context');
    return null;
  }

  return (
    <span
      className={cn(
        'flex items-center gap-1 bg-background transition-colors not-in-data-[folder=true]:ps-7 hover:bg-accent in-focus-visible:ring-[3px] in-focus-visible:ring-ring/50 in-data-[drag-target=true]:bg-accent in-data-[search-match=true]:bg-blue-50! in-data-[selected=true]:bg-accent in-data-[selected=true]:text-accent-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0',
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
            <Icons.Minus
              className="size-3.5 text-muted-foreground"
              stroke="currentColor"
              strokeWidth="1"
            />
          ) : (
            <Icons.Plus
              className="size-3.5 text-muted-foreground"
              stroke="currentColor"
              strokeWidth="1"
            />
          )
        ) : (
          <Icons.ChevronDown className="size-4 text-muted-foreground in-aria-[expanded=false]:-rotate-90" />
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
    // eslint-disable-next-line @eslint-react/purity -- dev-only guard
    console.warn(
      'TreeDragLine: No tree provided via context or tree does not have getDragLineStyle method',
    );
    return null;
  }

  const dragLine = tree.getDragLineStyle();
  return (
    <div
      className={cn(
        'absolute z-30 -mt-px h-0.5 w-[unset] bg-primary before:absolute before:-top-0.75 before:left-0 before:size-2 before:border-2 before:border-primary before:bg-background',
        'before:rounded-full',
        className,
      )}
      style={dragLine}
      {...props}
    />
  );
}

export { Tree, TreeDragLine, TreeItem, TreeItemLabel };
