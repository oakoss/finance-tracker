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

Avoid prop names that collide with **problematic** DOM attributes.
Common examples (not exhaustive):

- **`title`** -- renders a browser tooltip on any element. Never use.
- **`color`** -- legacy HTML attribute still recognized by browsers. Avoid.
- **`hidden`** -- hides the element. Never use as a custom prop.

`size` is safe for CVA variants — it is the standard prop name in
shadcn/ui. Always destructure custom props before spreading `...props`
so they don't leak to the DOM.

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

## Typography

Use Tailwind classes directly on semantic HTML elements. See
[styling.md](../styling.md) for the class convention table.
