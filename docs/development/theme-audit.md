# Theme Audit

Design token review for the component revamp (EPIC-24). Covers color,
spacing, radius, typography, dark mode, animation, and elevation.
Token definitions live in `src/styles/globals.css`.

## Color Palette

OKLCH-based tokens. Primary hue 245 (steel blue), 5 status colors,
chart palette, sidebar variants. All have light/dark pairs.

### Contrast Ratios (light mode, approximate)

| Pair                                | Ratio      | WCAG AA           |
| ----------------------------------- | ---------- | ----------------- |
| foreground / background             | 16.6:1     | Pass              |
| link-foreground / background        | 10.3:1     | Pass              |
| success-foreground / background     | 6.3:1      | Pass              |
| info-foreground / background        | 6.2:1      | Pass              |
| warning-foreground / background     | 5.3:1      | Pass              |
| destructive-foreground / background | 4.7:1      | Pass              |
| primary / primary-foreground        | 4.6:1      | Pass              |
| **muted-foreground / background**   | **~3.5:1** | **Fail (text)**   |
| muted-icon / background             | 3.3:1      | Pass (icons, 3:1) |

Dark mode ratios all pass (lowest is 6.6:1 for destructive).

### Issues

**`--muted-foreground` contrast.** L=0.54 yields ~3.5:1 against
white, below the 4.5:1 AA threshold for normal text. Used in 78
files (151 occurrences) for descriptions, placeholders, and
helper text. The separate `--muted-icon` token (L=0.552) exists
for icons but is only used in 2 components (`empty.tsx`,
`not-found.tsx`).

**Recommendation:** Darken to L=0.46 for 4.5:1 AA. Review all 151
usages during the component audit: keep for helper/description
text, switch pure-decorative or icon-adjacent text to
`text-muted-icon`.

**Identical semantic tokens.** `--secondary`, `--muted`, and
`--accent` share the same value in both modes:

- Light: `oklch(0.967 0.001 247)`
- Dark: `oklch(0.274 0.006 247)`

Three tokens, one color. If the revamp needs distinct accent
states (e.g., hover highlights vs muted backgrounds), these need
to diverge. Otherwise, simplify to reduce confusion.

**Missing tokens.** No `--tertiary` or `--surface` tokens. Some
shadcn/coss UI components use surface layers for nested cards or
stacked panels. The revamp may need a surface token between
`--background` and `--card`.

## Spacing Scale

Uses Tailwind's default 0.25rem grid. No custom spacing tokens.

Patterns are consistent:

- Containers: `gap-4` / `p-4`
- Inline elements: `gap-2`
- Inputs/buttons: `px-2.5`
- Card `sm` variant: `gap-3` / `p-3`

No one-off magic numbers. Scale is fine as-is.

## Border Radius

Base: `--radius: 0.625rem` (10px). Calc-derived scale:

| Token          | Value | Usage                  |
| -------------- | ----- | ---------------------- |
| `--radius-sm`  | 6px   | Small interactive      |
| `--radius-md`  | 8px   | Button small variants  |
| `--radius-lg`  | 10px  | Inputs, buttons        |
| `--radius-xl`  | 14px  | Cards, dialogs, alerts |
| `--radius-2xl` | 18px  | Large containers       |
| `--radius-3xl` | 22px  | Extra-large containers |
| `--radius-4xl` | 26px  | Badges (pill)          |

Matches shadcn's default `--radius: 0.625rem`. Well-calibrated.

## Typography

Three-font Fintech pairing (fonttrio.xyz):

| Role           | Font                   | Token          |
| -------------- | ---------------------- | -------------- |
| Headings       | Outfit Variable        | `font-heading` |
| Body           | IBM Plex Sans Variable | `font-sans`    |
| Financial data | IBM Plex Mono          | `font-mono`    |

Loaded via `@fontsource-variable`. Headings auto-apply
`font-heading` in `@layer base`. Inputs use `text-base` on mobile,
`md:text-sm` on desktop (prevents iOS zoom). No changes needed.

## Dark Mode

Full token remapping under `.dark` class. Tailwind v4 custom
variant: `@custom-variant dark (&:is(.dark *))`.

All tokens mapped. Key choices:

- `--border`: alpha-based (`oklch(1 0 0 / 10%)`) for transparency
  on varied backgrounds.
- `--card`/`--popover`: L=0.21, lighter than `--background` at
  L=0.141. Creates visual elevation without shadows.
- Status foregrounds shift lighter for dark-background readability.

Solid. No changes.

## Animation / Motion

Two imported libraries:

- `tw-animate-css`: `animate-in`/`animate-out` with fade, zoom,
  slide modifiers. Respects `prefers-reduced-motion`.
- `shadcn/tailwind.css`: accordion keyframes, data-attribute
  custom variants (`data-open`, `data-closed`, etc.).

No custom motion tokens (easing, duration). Components use:

- `duration-100` on dialog/overlay transitions
- `transition-all` or `transition-colors` from Tailwind

**Recommendation:** Consider adding `--duration-fast: 100ms` and
`--duration-normal: 200ms` if the revamp introduces new animated
components. Verify `prefers-reduced-motion` across all animated
components during TREK-132.

## Shadows / Elevation / Z-Index

No shadow CSS custom properties. Components use
`ring-1 ring-foreground/10` for subtle borders instead of
box-shadow. This is intentional: ring is border-like, shadow is
depth.

z-index is `z-50` on all overlays. Base UI manages its own
stacking context, so this works in practice. No token scale exists.

**Recommendation:** No changes needed for MVP. If the revamp
introduces stacked overlays (combobox inside dialog), verify
z-index behavior and add tokens if needed.

## Summary

| Priority | Change                                      | Reason                                |
| -------- | ------------------------------------------- | ------------------------------------- |
| P0       | Darken `--muted-foreground` to ~L=0.46      | WCAG AA 4.5:1 for text                |
| P1       | Audit 151 `text-muted-foreground` usages    | Some may need `text-muted-icon`       |
| P2       | Differentiate `--accent` from `--secondary` | Currently identical values            |
| P2       | Add duration tokens                         | Consistency for revamp transitions    |
| P3       | Add z-index token scale                     | Only if stacked overlay issues emerge |
