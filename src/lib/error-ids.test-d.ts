import { expectTypeOf } from 'vitest';

import { type ErrorId, errorIds } from '@/lib/error-ids';

// errorIds should be a readonly object
describe('errorIds', () => {
  it('should be a readonly const object', () => {
    expectTypeOf(errorIds).toBeObject();
    // Values should be literal string types, not widened to `string`
    expectTypeOf(
      errorIds.authEmailLocaleSetFailed,
    ).toEqualTypeOf<'auth.email.locale.set.failed'>();
    expectTypeOf(
      errorIds.authEmailLocaleResetFailed,
    ).toEqualTypeOf<'auth.email.locale.reset.failed'>();
    expectTypeOf(
      errorIds.authEmailRenderFailed,
    ).toEqualTypeOf<'auth.email.render.failed'>();
  });

  it('should not allow mutation', () => {
    expectTypeOf(errorIds).toMatchTypeOf<Readonly<Record<string, string>>>();
  });
});

describe('ErrorId', () => {
  it('should be a union of all error ID string literals', () => {
    expectTypeOf<ErrorId>().toEqualTypeOf<
      | 'auth.email.locale.set.failed'
      | 'auth.email.locale.reset.failed'
      | 'auth.email.render.failed'
    >();
  });

  it('should accept any valid error ID value', () => {
    expectTypeOf(errorIds.authEmailLocaleSetFailed).toMatchTypeOf<ErrorId>();
    expectTypeOf(errorIds.authEmailLocaleResetFailed).toMatchTypeOf<ErrorId>();
    expectTypeOf(errorIds.authEmailRenderFailed).toMatchTypeOf<ErrorId>();
  });

  it('should not accept arbitrary strings', () => {
    expectTypeOf<'random.string'>().not.toMatchTypeOf<ErrorId>();
    expectTypeOf<string>().not.toMatchTypeOf<ErrorId>();
  });
});
