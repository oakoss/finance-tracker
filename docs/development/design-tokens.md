# Design Tokens

Global design token guidance.

## Token layers

- Base tokens: raw values (`--background`, `--primary`).
- Semantic tokens: intent-based aliases (`--color-background`).

## Usage rules

- Components should use semantic tokens.
- Avoid hard-coded colors in `ui` components.
- Keep tokens theme-friendly (light/dark/future brand).

## Example pattern

```css
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
}
```
