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
