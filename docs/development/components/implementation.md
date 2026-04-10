# Components Implementation

This doc covers typing and Base UI render patterns.

## Typing rules

- Use `type` aliases, not interfaces.
- Wrap a single element per `ui` component.
- Export `<ComponentName>Props` for reuse.
- **Expose user-facing text as props** with English defaults. `ui/`
  components must not import Paraglide, but any visible text
  (placeholders, empty states, labels) must be overridable so
  consumers can pass i18n strings.

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

When `size` replaces the native HTML `size` attribute (e.g., on
`<input>`), use `Omit` to prevent type conflicts:

```tsx
function Input({
  size = 'default',
  ...props
}: Omit<React.ComponentProps<'input'>, 'size'> & {
  size?: 'default' | 'lg' | 'sm' | undefined;
}) { ... }
```

Components that consume `Input` via spread props should either
pass `size` through explicitly or destructure it out:

```tsx
// Pass through (PasswordInput)
}: Omit<React.ComponentProps<typeof Input>, 'type'>) {

// Strip (InputGroupInput — grouped inputs fill the container)
}: React.ComponentProps<'input'>) {
  const { size: _size, ...rest } = props;
```

### Size variants via data attributes

For components with a single variant axis, use `data-[size=*]`
selectors instead of CVA. This matches Select and Dialog:

```tsx
<Popup
  className="data-[size=sm]:sm:max-w-sm data-[size=default]:sm:max-w-lg"
  data-size={size}
/>
```

Use CVA when there are multiple variant axes (e.g., Button has
both `size` and `variant`).

## Base UI render pattern

Base UI uses `render` and `children` instead of `asChild`.

- `render` can be a React element or a function.
- Use `useRender` + `mergeProps` when you build custom wrappers.

```tsx
const { render } = useRender({ defaultTagName: 'button', props, ref, state });

return render;
```

Use `mergeProps` to safely combine handlers and classes.

## Trigger composition

Trigger components (`DialogTrigger`, `CollapsibleTrigger`,
`PopoverTrigger`, etc.) render a `<button>` by default. Nesting a
`<Button>` as a child creates invalid HTML (`<button>` inside
`<button>`) and causes hydration errors.

Use the `render` prop to replace the trigger's element:

```tsx
// Wrong — nested buttons
<CollapsibleTrigger>
  <Button size="sm" variant="outline">Toggle</Button>
</CollapsibleTrigger>

// Right — single button
<CollapsibleTrigger render={<Button size="sm" variant="outline" />}>
  Toggle
</CollapsibleTrigger>
```

This applies to all trigger components: `DialogTrigger`,
`AlertDialogTrigger`, `PopoverTrigger`, `DropdownMenuTrigger`,
`TooltipTrigger`, `SheetTrigger`, `CollapsibleTrigger`.

## Base UI escape hatches

- `event.preventBaseUIHandler()` stops Base UI default handlers.
- Prefer component props first; use the escape hatch only when necessary.

## Typography

Use Tailwind classes directly on semantic HTML elements. See
[styling.md](../styling.md) for the class convention table.
