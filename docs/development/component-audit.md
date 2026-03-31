# Component Audit

Side-by-side comparison of our ~69 UI components against shadcn/ui
(base-nova) and coss UI. All three use Base UI primitives. Findings
drive TREK-133 through TREK-139.

**Legend:** Verdict column uses `keep` (no changes needed), `update`
(sync with latest shadcn), `adopt` (take from coss), `fix` (custom
improvement needed). Priority: P0 broken, P1 inconsistent, P2 polish,
skip (fine as-is).

---

## 1. Forms (TREK-133)

| Component      | Base UI            | Variants        | Verdict | Priority | Notes                                                                                                                    |
| -------------- | ------------------ | --------------- | ------- | -------- | ------------------------------------------------------------------------------------------------------------------------ |
| field          | No                 | orientation (3) | keep    | skip     | 10 exports. FieldError dedupes. More complete than shadcn and coss equivalents.                                          |
| input          | Yes                | None            | update  | P2       | Single size (h-8). shadcn latest adds size variants (sm/default/lg). Consider adding for consistency with select/button. |
| textarea       | No                 | None            | keep    | skip     | Uses `field-sizing-content` for auto-grow. Clean.                                                                        |
| checkbox       | Yes                | None            | keep    | skip     | Proper Base UI compound. Touch target via `after:` pseudo.                                                               |
| switch         | Yes                | size (2)        | keep    | skip     | Has sm/default sizes. Touch target via `after:` pseudo.                                                                  |
| radio-group    | Yes                | None            | keep    | skip     | Clean Base UI wrapper.                                                                                                   |
| select         | Yes                | size (2)        | keep    | skip     | Full compound with scroll arrows, positioner, separator.                                                                 |
| native-select  | No                 | size (2)        | keep    | skip     | Proper fallback for mobile. Custom chevron icon.                                                                         |
| number-field   | Yes                | size (3)        | keep    | skip     | Context-based compound with scrub area. More capable than shadcn and coss.                                               |
| label          | No                 | None            | keep    | skip     | Simple, correct.                                                                                                         |
| password-input | No                 | None            | keep    | P2       | i18n-ready toggle labels. Consider extracting toggle logic to a generic `InputReveal` pattern.                           |
| input-otp      | No (input-otp lib) | None            | keep    | skip     | Uses `input-otp` package. Standard implementation.                                                                       |
| input-group    | No                 | align (4)       | keep    | skip     | Flexible addon system with auto-focus. Not in shadcn/coss.                                                               |
| phone-input    | No                 | None            | keep    | skip     | International phone input with country selector.                                                                         |

**Summary for TREK-133:** One action item: add size variants
to `input` (P2).

---

## 2. Selection (TREK-134)

| Component    | Base UI | Variants              | Verdict | Priority | Notes                                                                                                                                                                  |
| ------------ | ------- | --------------------- | ------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| combobox     | Yes     | None                  | keep    | skip     | 16 exports: chips, clear, empty state. Uses InputGroup composition.                                                                                                    |
| autocomplete | Yes     | size (3)              | keep    | P2       | Similar to combobox but uses Autocomplete primitive. Has InputGroup integration and ScrollArea. Review overlap with combobox — may want to document when to use which. |
| toggle       | Yes     | variant (2), size (4) | keep    | skip     | Clean Base UI Toggle.Root wrapper.                                                                                                                                     |
| toggle-group | Yes     | variant (2), size (4) | keep    | skip     | Compound with context for size/variant inheritance.                                                                                                                    |

**Summary for TREK-134:** One action item: document combobox vs
autocomplete usage guidance (P2).

---

## 3. Overlays (TREK-135)

| Component     | Base UI | Variants      | Verdict | Priority | Notes                                                                                                                                                                                                              |
| ------------- | ------- | ------------- | ------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| dialog        | Yes     | None          | update  | P1       | `showCloseButton` on content (default true) and footer (default false). Desktop `sm:max-w-sm` may be too narrow for complex forms. Add size variants (sm/default/lg), preserving mobile `max-w-[calc(100%-2rem)]`. |
| alert-dialog  | Yes     | size (2)      | keep    | skip     | AlertDialogMedia for icon placement. Grid layout with responsive breakpoints.                                                                                                                                      |
| sheet         | Yes     | side (4)      | keep    | skip     | Proper side variants with directional animations. Close button via render prop.                                                                                                                                    |
| drawer        | Yes     | direction (4) | keep    | skip     | Base UI Drawer primitive (swipe-to-dismiss). Viewport wrapper for proper containment.                                                                                                                              |
| popover       | Yes     | None          | keep    | skip     | Clean positioner pattern. Has header/title/description sub-components.                                                                                                                                             |
| tooltip       | Yes     | None          | keep    | P2       | Has arrow. Uses `data-[state=delayed-open]` alongside `data-open` — verify if Radix-era selector is still needed.                                                                                                  |
| hover-card    | Yes     | None          | keep    | skip     | Uses `PreviewCard` primitive correctly.                                                                                                                                                                            |
| context-menu  | Yes     | None          | keep    | skip     | Full compound with sub-menus, checkboxes, radio items.                                                                                                                                                             |
| dropdown-menu | Yes     | None          | keep    | skip     | Full compound with sub-menus, checkboxes, radio items. Mirrors context-menu API.                                                                                                                                   |

**Summary for TREK-135:** Consider adding size variants to dialog
(P1). Verify Radix-era `data-[state=*]` selectors in tooltip (P2).

---

## 4. Data Display (TREK-136)

| Component | Base UI         | Variants                    | Verdict | Priority | Notes                                                                                                                 |
| --------- | --------------- | --------------------------- | ------- | -------- | --------------------------------------------------------------------------------------------------------------------- |
| table     | No              | None                        | keep    | skip     | Pure HTML table with container for overflow. Used by data-grid system.                                                |
| card      | No              | size (2)                    | keep    | skip     | Good compound (7 exports). Has CardAction slot. Size variant (default/sm) with responsive padding.                    |
| badge     | Yes (useRender) | variant (22), size (5)      | keep    | skip     | Uses `useRender`/`mergeProps`. Status variants (success, warning, info, destructive) with light/outline sub-variants. |
| timeline  | Yes (useRender) | orientation (2)             | keep    | skip     | Context-based with active step tracking. Uses `useRender`/`mergeProps`. Custom component, not in shadcn.              |
| stepper   | No              | orientation (2)             | keep    | skip     | Full state machine (active/completed/inactive/loading). Custom component, not in shadcn.                              |
| chart     | No (Recharts)   | None                        | keep    | skip     | Recharts wrapper with theme integration. Standard shadcn chart pattern.                                               |
| rating    | No              | None                        | keep    | skip     | Custom component. Not in shadcn or coss.                                                                              |
| empty     | No              | size (2), media variant (3) | keep    | skip     | Custom compound for empty states. Not in standard shadcn (exists in base-nova).                                       |
| avatar    | Yes             | None                        | keep    | skip     | Base UI compound with image fallback to initials.                                                                     |

**Summary for TREK-136:** No action items. Badge uses
`useRender`/`mergeProps` well; good reference for the pattern.

---

## 5. Navigation (TREK-137)

| Component       | Base UI | Variants    | Verdict | Priority | Notes                                                                                      |
| --------------- | ------- | ----------- | ------- | -------- | ------------------------------------------------------------------------------------------ |
| sidebar         | Yes     | None        | keep    | skip     | Large compound (~700 LOC). Cookie-persisted collapsed state. Icon-rail mode.               |
| tabs            | Yes     | variant (2) | keep    | skip     | Has default (pill) and line variants. Orientation support (horizontal/vertical). Uses CVA. |
| breadcrumb      | Yes     | None        | keep    | skip     | Clean compound with separator customization.                                               |
| pagination      | Yes     | None        | keep    | skip     | Standard page navigation with ellipsis.                                                    |
| navigation-menu | Yes     | None        | keep    | skip     | Full compound with viewport animation, indicator, and sub-menus.                           |
| menubar         | Yes     | None        | keep    | skip     | Full compound matching context-menu pattern.                                               |
| scrollspy       | No      | None        | keep    | skip     | Custom IntersectionObserver-based component. Not in shadcn/coss.                           |

**Summary for TREK-137:** No action items.

---

## 6. Date/Time (TREK-138)

| Component   | Base UI               | Variants | Verdict | Priority | Notes                                                                                                                                                                     |
| ----------- | --------------------- | -------- | ------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| calendar    | No (react-day-picker) | None     | keep    | P2       | Uses react-day-picker with custom classNames mapping. Locale-aware via Paraglide. Consider: Base UI is developing a Calendar primitive — when stable, evaluate migration. |
| date-picker | No                    | None     | keep    | P2       | Composition of Popover + Calendar + Button. Works but could benefit from range selection support for future reporting needs.                                              |
| timestamp   | No                    | None     | keep    | skip     | Relative time display with tooltip for absolute time. Custom component.                                                                                                   |

**Summary for TREK-138:** Date/time works for current needs.
Calendar migration to Base UI primitive is a future consideration
(not yet stable). Range picker is a future feature need, not a
current gap.

---

## 7. Layout/Utility (TREK-139)

| Component    | Base UI | Variants              | Verdict | Priority | Notes                                                                                                                |
| ------------ | ------- | --------------------- | ------- | -------- | -------------------------------------------------------------------------------------------------------------------- |
| button       | Yes     | variant (6), size (8) | keep    | skip     | 6 variants, 8 sizes including icon sizes. Loading state. RouterButton via `createLink`.                              |
| button-group | Yes     | variant, size         | keep    | skip     | Context-based compound inheriting variant/size to children.                                                          |
| accordion    | Yes     | None                  | keep    | skip     | Proper Base UI compound with animated panels.                                                                        |
| collapsible  | Yes     | None                  | keep    | skip     | Simple Base UI wrapper.                                                                                              |
| resizable    | Yes     | direction             | keep    | skip     | Resize handle with Base UI.                                                                                          |
| scroll-area  | Yes     | None                  | keep    | skip     | Base UI ScrollArea with custom scrollbar styling.                                                                    |
| separator    | Yes     | None                  | keep    | skip     | Base UI Separator.                                                                                                   |
| slider       | Yes     | None                  | keep    | skip     | Base UI Slider with range support.                                                                                   |
| kbd          | No      | None                  | keep    | skip     | Keyboard shortcut display.                                                                                           |
| aspect-ratio | No      | None                  | keep    | skip     | CSS aspect-ratio wrapper.                                                                                            |
| link         | No      | None                  | keep    | skip     | TanStack Router Link wrapper with styling.                                                                           |
| banner       | No      | variant (4)           | keep    | skip     | Custom full-width notification banner. Has assertive/polite ARIA roles based on variant. Dismissible. Not in shadcn. |
| alert        | No      | variant (6)           | keep    | skip     | Inline alert with action slot. Grid layout.                                                                          |

**Summary for TREK-139:** No action items.

---

## 8. Feedback

| Component | Base UI         | Variants | Verdict | Priority | Notes                                             |
| --------- | --------------- | -------- | ------- | -------- | ------------------------------------------------- |
| sonner    | No (sonner lib) | None     | keep    | skip     | Sonner toast wrapper with theme integration.      |
| progress  | Yes             | None     | keep    | skip     | Base UI compound with label/value sub-components. |
| spinner   | No              | None     | keep    | skip     | SVG spinner with `role="status"`.                 |
| skeleton  | No              | None     | keep    | skip     | Pulse animation div.                              |

---

## 9. Specialized

| Component                  | Base UI   | Variants    | Verdict | Priority | Notes                                                                                               |
| -------------------------- | --------- | ----------- | ------- | -------- | --------------------------------------------------------------------------------------------------- |
| tree                       | Yes       | None        | keep    | skip     | Collapsible file tree. Uses Accordion primitive internally.                                         |
| sortable                   | Yes       | None        | keep    | skip     | Drag-and-drop reordering.                                                                           |
| command                    | No (cmdk) | None        | keep    | skip     | Command palette wrapper.                                                                            |
| item                       | Yes       | variant (3) | keep    | skip     | Base UI Menu/Select-style item with icon, description, shortcut slots. Shared across menus/selects. |
| confirm-destructive-dialog | Yes       | None        | keep    | skip     | Type-to-confirm dialog. Well-tested (has test file).                                                |
| direction                  | Yes       | None        | keep    | skip     | RTL/LTR direction provider.                                                                         |

---

## 10. Composite Systems

### Filters (`src/components/filters/`)

10 files. Context-based with variant/size config. 28 predefined
operators. Custom validation and rendering per field. No equivalent in shadcn or coss.

**Verdict:** keep. No changes needed.

### Data Grid (`src/components/data-grid/`)

8 files. Composable TanStack Table wrapper with DnD columns/rows,
column header controls (sort/pin/move/visibility), and pagination.

**Verdict:** keep. No changes needed.

---

## Cross-Cutting Findings

### P0: muted-foreground contrast

From theme audit (TREK-141): `--muted-foreground` at L=0.54 gives
~3.5:1 contrast, below WCAG AA 4.5:1 for text.

**Affected components** (using `text-muted-foreground`):

- Forms: field (FieldDescription), select (SelectLabel, SelectIcon),
  combobox (ComboboxLabel, ComboboxEmpty), autocomplete, native-select
- Overlays: dialog (DialogDescription), sheet (SheetDescription),
  alert-dialog (AlertDialogDescription), popover (PopoverDescription),
  drawer (DrawerDescription)
- Data display: card (CardDescription), empty (EmptyDescription),
  table (TableCaption)
- Navigation: tabs (TabsTrigger inactive state), breadcrumb
- Layout: alert (AlertDescription), banner (BannerDescription)
- Feedback: progress (ProgressValue)

**Action:** Darken `--muted-foreground` to ~L=0.46 in globals.css
(one-line fix). Then audit each usage: keep for descriptions/helper
text (now passing), switch pure-icon or decorative uses to
`text-muted-icon`.

### P1: Dialog size variants

Dialog content is fixed at `sm:max-w-sm` (384px). Complex forms
(account creation, import review, budget setup) need wider dialogs.

**Action:** Add `size` prop to DialogContent (sm/default/lg/xl)
matching AlertDialog's pattern.

### P2: Radix-era data-state selectors

Some components use `data-[state=...]` selectors alongside Base UI's
`data-open`/`data-closed`. Tooltip has `data-[state=delayed-open]`
(Radix pattern); navigation-menu has `data-[state=visible/hidden]`.
Other uses (table `data-[state=selected]`, sidebar
`data-[state=collapsed]`, stepper `data-[state=active]`) are our own
custom state attributes and are correct.

**Action:** During the revamp, verify tooltip and navigation-menu
`data-[state=*]` selectors are still needed or if Base UI equivalents
(`data-open`, `data-closed`) cover the behavior.

### P2: Input size variants

Input has no size variants (always h-8). Select, button, and
number-field all have size variants. Inconsistent.

**Action:** Add size variants to Input (sm/default/lg) matching
the select pattern.

### P2: Combobox vs Autocomplete guidance

Both components exist and serve similar purposes. Combobox is for
selecting from a fixed list. Autocomplete is for free-text with
suggestions. This distinction isn't documented.

**Action:** Add usage guidance to the component authoring docs.

### Info: Identical semantic tokens

`--secondary`, `--muted`, and `--accent` share identical values.
Components using these tokens work correctly today, but if the
revamp needs distinct hover/active states, the tokens need to
diverge.

**Affected:** button (secondary variant uses `bg-secondary`),
tabs (default list uses `bg-muted`), badge (secondary variant).

**Action:** No change needed for MVP. Flag for TREK-141 follow-up
if visual differentiation is needed.

### P2: prefers-reduced-motion gaps

`tw-animate-css` guards its keyframe animations behind
`prefers-reduced-motion`. Accordion keyframes from
`shadcn/tailwind.css` also respect the preference. However,
plain `transition-*` utilities (`transition-all`,
`transition-colors`) do **not** automatically disable for
motion-sensitive users. Components using these (button, link,
tabs, navigation-menu, select, input, and others) still
animate transitions regardless of the user's preference.

**Action:** During the revamp, add `motion-reduce:transition-none`
to components with `transition-*` classes, or add a global
`@media (prefers-reduced-motion: reduce)` rule to disable
transitions.

### Info: Missing components vs coss UI

Coss UI has components we lack: **Meter**, **Toolbar**,
**Frame/Group** (layout primitives), **Checkbox Group**, and
**Preview Card** (our hover-card covers this).

None of these are needed for current features. Meter could be
useful for budget progress (currently using Progress). Toolbar
could be useful for rich text editing if added later.

**Action:** No changes needed. Note for future reference.

---

## Summary by Downstream Task

| Task                      | Action Items                                                                              | Priority |
| ------------------------- | ----------------------------------------------------------------------------------------- | -------- |
| TREK-133 (Forms)          | Add size variants to Input                                                                | P2       |
| TREK-134 (Selection)      | Document combobox vs autocomplete                                                         | P2       |
| TREK-135 (Overlays)       | Add size variants to Dialog. Verify Radix-era selectors in Tooltip                        | P1, P2   |
| TREK-136 (Data Display)   | None                                                                                      | skip     |
| TREK-137 (Navigation)     | None                                                                                      | skip     |
| TREK-138 (Date/Time)      | None (future: Base UI Calendar, range picker)                                             | skip     |
| TREK-139 (Layout/Utility) | None                                                                                      | skip     |
| Cross-cutting             | Darken --muted-foreground token. Add motion-reduce overrides for transition-\* components | P0, P2   |
