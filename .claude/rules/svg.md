---
paths:
  - public/**/*.svg
  - src/components/logo.tsx
---

# SVG Rules

## React components

- Use `currentColor` for stroke/fill so icons inherit text color.
- Set `aria-hidden="true"` when decorative (text label nearby).
- Size with Tailwind classes (`size-6`), not inline width/height.
- Keep viewBox at `0 0 24 24` to match Lucide convention.

## Standalone SVGs (`public/`)

- Set `role="img"` and include `<title>` for accessibility.
- Set intrinsic `width`/`height` (e.g. 128) for reasonable default
  render size; viewBox defines the coordinate system independently.

## Geometry

- Strokes are centered on path edges and bleed outside the viewBox.
  Pull geometry inward by half the strokeWidth from viewBox bounds.
- Keep decimal precision reasonable at small viewBox sizes (24x24).

## Favicons

- Use SVG favicons, not `.ico`. No `<link>` to `favicon.ico`.
- Dark mode: two separate SVG files with `media` attribute on link
  tags. Chrome does not apply `prefers-color-scheme` inside SVGs
  when used as favicons.

```tsx
{ href: '/logo.svg', media: '(prefers-color-scheme: light)', rel: 'icon', type: 'image/svg+xml' },
{ href: '/logo-dark.svg', media: '(prefers-color-scheme: dark)', rel: 'icon', type: 'image/svg+xml' },
```

## Color tokens

- Light favicon: `#2a597f` (primary, oklch 0.45 0.08 245).
- Dark favicon: `#8fb4d0` (dark primary, oklch 0.70 0.08 245).
