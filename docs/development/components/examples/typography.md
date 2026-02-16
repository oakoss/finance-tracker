# Typography Examples

These examples use the `Typography` component and helpers from
`src/components/ui/typography.tsx`.

## Basic usage

```tsx
import {
  Typography,
  TypographyBlockquote,
  TypographyH1,
  TypographyInlineCode,
  TypographyLead,
  TypographyList,
  TypographyMuted,
  TypographyP,
} from '@/components/ui/typography';

export function TypographyExample() {
  return (
    <div>
      <TypographyH1>Monthly overview</TypographyH1>
      <TypographyLead>High-level performance and trends.</TypographyLead>
      <TypographyP>
        Track your spending and compare month-over-month changes.
      </TypographyP>
      <TypographyList>
        <li>Net income overview</li>
        <li>Cash flow summary</li>
        <li>Upcoming bills</li>
      </TypographyList>
      <TypographyBlockquote>
        Budgeting is about priorities, not restrictions.
      </TypographyBlockquote>
      <TypographyP>
        Use <TypographyInlineCode>recurring</TypographyInlineCode> tags to
        categorize subscriptions.
      </TypographyP>
      <TypographyMuted>Updated 2 hours ago.</TypographyMuted>
    </div>
  );
}
```

## Variant + element override

```tsx
import { Typography } from '@/components/ui/typography';

export function TypographyOverrideExample() {
  return (
    <Typography as="h2" variant="h1">
      Hero headline rendered as h2
    </Typography>
  );
}
```
