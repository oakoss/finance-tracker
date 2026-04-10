# Research: Base UI Combobox empty state behavior

Date: 2026-04-09
Related: TREK-225 / TREK-36

## Summary

Discovered that Base UI's `Combobox.Empty` component only works
when the root `Combobox` receives an `items` prop. Without it,
the empty state renders unconditionally.

## Root cause

`Combobox.Empty` "renders its children only when the list is empty"
(per Base UI docs), but it determines emptiness by tracking the
collection provided via `items`. With manually mapped children
(`.map()` pattern), Base UI has no collection to track and cannot
compute "is empty."

The shadcn wrapper's CSS fallback (`hidden` default +
`group-data-empty/combobox-content:flex`) was also broken: Base UI
sets `data-empty` on the List element, not the Popup (Content),
so the group selector never matched.

## Fix

- Static-list comboboxes: pass `items` to root, use
  `ComboboxCollection` render-child pattern. Base UI handles
  empty state natively.
- Manual-filtering comboboxes (controlled search, synthetic items):
  keep `ComboboxEmpty` in the tree for keyboard behavior (Escape
  handling), accept that it won't render visually. Or use a
  conditional `<p>` for the empty message.
- Documented in `docs/development/components/examples/form.md`.

## Keyboard behavior

Removing `ComboboxEmpty` from the tree changes Escape key handling.
When the list is empty and Empty is absent, Escape bubbles past the
combobox and closes the parent dialog. Keeping Empty in the tree
(even if hidden) preserves correct keyboard behavior.
