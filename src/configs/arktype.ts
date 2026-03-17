import { configure } from 'arktype/config';

import { m } from '@/paraglide/messages';

configure({
  keywords: {
    number: { expected: () => m['validation.number']() },
    string: { expected: () => m['validation.string']() },
    'string.email': { expected: () => m['validation.email']() },
    'string.url': { expected: () => m['validation.url']() },
  },
  maxLength: {
    expected: (ctx) => m['validation.maxLength']({ max: String(ctx.rule) }),
  },
  minLength: {
    expected: (ctx) =>
      ctx.rule === 1
        ? m['validation.required']()
        : m['validation.minLength']({ min: String(ctx.rule) }),
  },
});
