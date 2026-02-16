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

## Accessibility baseline

- Use semantic elements (`button`, `label`, `nav`, `ul/li`).
- Ensure keyboard navigation works by default.
- Provide accessible names for icon-only controls.
- Add `aria-invalid` when invalid and `data-invalid` on wrappers.
- Maintain visible focus indicators.

## Do not do

- Divs acting like buttons.
- Placeholder-only labels.
- Empty links or buttons.
