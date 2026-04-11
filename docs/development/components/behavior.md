# Components Behavior

This doc covers state patterns and accessibility expectations.

## State patterns

- Support controlled and uncontrolled usage when feasible.
- Controlled: accept `value`/`open` and `onValueChange`/`onOpenChange`.
- Uncontrolled: accept `defaultValue`/`defaultOpen`.
- Root components should own shared state in compound patterns.

## Base UI change events

Base UI change handlers receive `(value, eventDetails)`.

- Use `eventDetails.reason` to branch behaviors.
- `eventDetails.cancel()` stops internal state updates.
- `eventDetails.allowPropagation()` lets DOM events bubble.

## DataGrid row clicks

Pass `onRowClick` to `<DataGrid>` to make rows clickable. The
shared row handler ignores two kinds of bubbled events so they
never trigger a row click:

- **Clicks inside portal-rendered content** (dropdown menus,
  confirm dialogs). React bubbles synthetic events through the
  component tree even though the portal lives outside the `<tr>`
  in the real DOM.
- **Clicks on interactive elements inside row cells** (`button`,
  `a`, `input`, `select`, `textarea`, `label`, or any element
  with an ARIA interactive role such as `[role="button"]` or
  `[role="menuitem"]`). Those elements handle their own click.

To opt a non-interactive cell element out of row-click
propagation, set `data-stop-row-click` on it or any ancestor
inside the row. The handler skips any click whose closest
matching ancestor is inside the `<tr>`.

## Accessibility baseline

- Use semantic elements (`button`, `label`, `nav`, `ul/li`).
- Ensure keyboard navigation works by default.
- Provide accessible names for icon-only controls.
- Add `aria-invalid` when invalid and `data-invalid` on wrappers.
- Maintain visible focus indicators.

## Reduced motion

A global `@media (prefers-reduced-motion: reduce)` rule in
`src/styles/globals.css` sets `transition-duration` and
`animation-duration` to near-zero for all elements. Per-component
`motion-reduce:` overrides are not needed. `tw-animate-css`
provides additional keyframe guards.

## Do not do

- Divs acting like buttons.
- Placeholder-only labels.
- Empty links or buttons.
