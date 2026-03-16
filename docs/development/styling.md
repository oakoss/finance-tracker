# Styling Guide

Styling patterns and conventions for the finance tracker.

## Principles

- Base styles first, variants second, state third, overrides last.
- Use design tokens and CSS variables over hard-coded values.
- Use `cn()` from `@/lib/utils` for class composition.

## Class order

```tsx
className={cn(
  "base",
  variant && variantStyles,
  isActive && "is-active",
  className
)}
```

## When to use CVA

- Multiple variants or sizes.
- Shared variant logic across components.
- Typed variants are needed.

Keep CVA definitions outside component bodies. Avoid inline styles
unless token-driven.

## Tailwind setup

- Tailwind v4 uses the CSS-based config entry at `src/styles/globals.css`.
- `eslint-plugin-better-tailwindcss` is configured with:
  - `entryPoint: src/styles/globals.css`
  - `tsconfig: ./tsconfig.json`
  - `rootFontSize: 16`
- Linting catches deprecated or duplicate utilities and enforces
  shorthand classes (warn). See `eslint.config.js` for the full list.

## Design tokens

Global tokens live in `src/styles/globals.css` under `:root` and
`.dark`.

### Token layers

- **Base tokens**: raw values (`--background`, `--primary`)
- **Semantic tokens**: intent-based aliases (`--color-background`)
- **Status tokens**: `success`, `info`, `warning`, `destructive`,
  `invert` (defined as OKLCH values)

The `@theme inline` section mirrors the same tokens for Tailwind usage:

```css
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
}
```

### Rules

- Components should use semantic tokens, not raw values.
- Avoid hard-coded colors in `ui` components.
- Keep tokens theme-friendly (light/dark/future brand themes).

## Typography

Three font families via the Fintech pairing (fonttrio.xyz):

- **Heading** (`font-heading`): Outfit — geometric clarity for headings
- **Body** (`font-sans`): IBM Plex Sans — readable for data-heavy interfaces
- **Mono** (`font-mono`): IBM Plex Mono — tabular numbers for financial data

Headings (`h1`-`h6`) use `font-heading` automatically via base styles.
Use Tailwind classes directly on semantic HTML elements. No wrapper
component.

| Role              | Element              | Classes                                               |
| ----------------- | -------------------- | ----------------------------------------------------- |
| Display heading   | `<h1>`               | `text-4xl font-extrabold tracking-tight text-balance` |
| Page heading      | `<h1>`               | `text-2xl font-semibold tracking-tight`               |
| Section heading   | `<h2>`               | `text-xl font-semibold tracking-tight`                |
| Sub-heading       | `<h3>`               | `text-lg font-semibold tracking-tight`                |
| Body              | `<p>`                | `leading-7`                                           |
| Muted / caption   | `<p>`                | `text-sm text-muted-foreground`                       |
| Small / label     | `<legend>`, `<span>` | `text-sm font-medium leading-none`                    |
| Financial numbers | `<span>`             | `font-mono tabular-nums`                              |

Inside UI sub-components (`CardTitle`, `DialogTitle`, `TableCell`,
`Empty`), rely on the component's built-in text styling rather than
applying these classes manually.

## Autofill & password manager overrides

Browser autofill and password manager extensions inject their own
styles on filled inputs. Global overrides live in
`src/styles/globals.css` (unlayered, after `@layer base`).

### Why this is tricky

- **Chrome UA `!important`**: Chrome's user-agent stylesheet sets
  `background-color` with `!important` on `:-webkit-autofill`. UA
  `!important` beats author `!important` — you cannot override it
  directly.
- **Dark mode semi-transparency**: Chrome's dark-mode autofill uses
  `rgba(70, 90, 126, 0.4)` via `light-dark()`, which composites on
  top of `box-shadow` inset.
- **1Password + oklch()**: 1Password detects light/dark by parsing
  the input's computed `color`. Its parser does not understand
  `oklch()` (Tailwind v4 default), so it always falls back to
  `"light"` — applying a light blue background in dark mode.
- **Tailwind layer cascade**: Rules inside `@layer base` lose to
  Chrome's UA styles. Autofill overrides must be **unlayered**.
- **Tailwind `transition-colors`**: The Input component's
  `transition-colors` utility can override autofill transition
  delays. Use `!important` on the transition property.

### What works

| Source                             | Selector                        | Technique                                                                                                        |
| ---------------------------------- | ------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| 1Password                          | `[data-com-onepassword-filled]` | `background-image: linear-gradient(var(--card), var(--card)) !important` — paints over inline `background-color` |
| LastPass                           | `[data-lastpass-icon-root]`     | `display: none !important` to hide injected overlays                                                             |
| Chrome/Safari/Edge                 | `:-webkit-autofill`             | `background-image` gradient + `box-shadow` inset + transition delay                                              |
| Firefox                            | `:autofill`                     | Direct `background-color !important` (Firefox UA is less aggressive)                                             |
| Bitwarden/Dashlane/Keeper/NordPass | Browser-native autofill         | Covered by `:-webkit-autofill` / `:autofill` rules                                                               |

### Key insight: `background-image` over `background-color`

CSS paints `background-image` **on top of** `background-color`. This
sidesteps the entire cascade battle — we don't try to override the
UA `background-color`, we just cover it with an opaque gradient.

### Form inputs: `autoComplete` attribute

Always set `autoComplete` on auth inputs for proper browser/manager
behavior:

- Sign-in: `email` → `autoComplete="email"`, password →
  `autoComplete="current-password"`
- Sign-up: name → `autoComplete="name"`, email →
  `autoComplete="email"`, password → `autoComplete="new-password"`
