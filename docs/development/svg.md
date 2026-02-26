# SVG Guide

Conventions for SVG icons, logos, and favicons.

## React icon components

Inline SVGs in React components for CSS control and no extra network requests.

```tsx
export function Logo({ className = 'size-6' }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* paths */}
    </svg>
  );
}
```

**Key decisions:**

- `currentColor` inherits from the parent's text color, so icons
  adapt to themes automatically.
- `aria-hidden="true"` because the icon is decorative when
  accompanied by a text label. Standalone icons need `role="img"`
  and a `<title>` element instead.
- `viewBox="0 0 24 24"` matches the Lucide icon convention so all
  icons size consistently.
- Sizing via Tailwind classes (`size-6`, `size-12`) rather than
  inline `width`/`height` attributes.

## Standalone SVGs

Files in `public/` (logo, og-image sources, etc.):

- Set explicit `width` and `height` attributes (e.g. `128`) for a
  reasonable default render size when opened directly in a browser.
  The `viewBox` defines the coordinate system independently.
- Include `role="img"` and a `<title>` element for accessibility.
- Use `preserveAspectRatio` default (`xMidYMid meet`) unless there
  is a specific reason to change it.

## Stroke bleed

SVG strokes are centered on path edges. A `strokeWidth="2"` path at
`x=0` bleeds 1px outside the viewBox on the left. Pull geometry
inward by half the strokeWidth from viewBox bounds.

```text
viewBox 0..24, strokeWidth 2 → keep geometry within 1..23
```

## Favicons

### No `.ico` files

SVG favicons are supported in Chrome 76+, Firefox 67+, Safari 12.1+
(~95% of browsers as of 2025). The `.ico` format adds no value for
our target audience and cannot adapt to dark mode.

### Dark mode

Chrome does **not** evaluate `prefers-color-scheme` media queries
embedded inside SVG files when rendering favicons. The workaround is
two separate SVG files with the `media` attribute on the HTML
`<link>` tags:

```tsx
// in __root.tsx head() links
{ href: '/logo.svg', media: '(prefers-color-scheme: light)', rel: 'icon', type: 'image/svg+xml' },
{ href: '/logo-dark.svg', media: '(prefers-color-scheme: dark)', rel: 'icon', type: 'image/svg+xml' },
```

A `<link rel="icon">` **without** a `media` attribute will take
priority over links that have one, so do not include a bare `.ico`
link alongside the adaptive SVG links.

### Favicon colors

| Mode  | Hex       | OKLCH           |
| ----- | --------- | --------------- |
| Light | `#2a597f` | `0.45 0.08 245` |
| Dark  | `#8fb4d0` | `0.70 0.08 245` |

### PWA icons

`logo192.png` and `logo512.png` in `public/` for the web app
manifest. Regenerate from the SVG source when the logo changes.

## Optimization

Hand-authored SVGs with minimal elements (like our logo) don't need
SVGO. For complex exported SVGs, run through SVGO to strip editor
metadata and reduce precision.

## Future: icon sprite system

If the app grows beyond a handful of custom icons, use `<symbol>` +
`<use>` sprites (one network request, reusable definitions). For now,
inline React components are sufficient.
