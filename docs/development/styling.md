# Styling Guide

Global styling guidance for this repo.

## Principles

- Base styles first, variants second, state third, overrides last.
- Prefer tokens and CSS variables over hard-coded values.
- Use `cn` for class composition.

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
- You need typed variants.

## Notes

- Keep CVA definitions outside component bodies.
- Avoid inline styles unless token-driven.

## Tailwind setup

- Tailwind v4 uses the CSS-based config entry at `src/styles/globals.css`.
- `eslint-plugin-better-tailwindcss` is configured with:
  - `entryPoint: src/styles/globals.css`
  - `tsconfig: ./tsconfig.json`
  - `rootFontSize: 16`
- Linting is based on the recommended better-tailwindcss rules with overrides;
  it catches deprecated or duplicate utilities and enforces shorthand classes
  (warn). See `eslint.config.js` for the authoritative list of rules.

## Design tokens

- Global tokens live in `src/styles/globals.css` under `:root` and `.dark`.
- Status tokens (`success`, `info`, `warning`, `destructive`, `invert`) are defined as OKLCH values.
- The `@theme inline` section mirrors the same tokens for Tailwind usage.
