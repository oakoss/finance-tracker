# Components Implementation

This doc covers typing and Base UI render patterns.

## Typing rules

- Use `type` aliases, not interfaces.
- Wrap a single element per `ui` component.
- Export `<ComponentName>Props` for reuse.

```tsx
export type CardProps = React.ComponentProps<'div'> & {
  variant?: 'default' | 'outline';
};
```

Avoid prop name collisions with DOM attributes (`title`, `color`, `size`).

## Base UI render pattern

Base UI uses `render` and `children` instead of `asChild`.

- `render` can be a React element or a function.
- Use `useRender` + `mergeProps` when you build custom wrappers.

```tsx
const { render } = useRender({
  defaultTagName: 'button',
  props,
  ref,
  state,
});

return render;
```

Use `mergeProps` to safely combine handlers and classes.

## Base UI escape hatches

- `event.preventBaseUIHandler()` stops Base UI default handlers.
- Prefer component props first; use the escape hatch only when necessary.

## Typography component

- Prefer `Typography` for consistent text styles.
- Use `variant` to select styles and `as` to override the element.
- Helpers like `TypographyH1` are preferred for simple cases.
