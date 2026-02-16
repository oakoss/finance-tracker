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
