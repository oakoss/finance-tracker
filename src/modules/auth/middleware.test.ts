import { requireUserId } from '@/modules/auth/middleware';

describe('requireUserId', () => {
  it('returns userId when session has a valid user', () => {
    const userId = requireUserId({
      session: { session: {} as never, user: { id: 'user-123' } as never },
    });

    expect(userId).toBe('user-123');
  });

  it('throws 401 when session is null', () => {
    expect(() => requireUserId({ session: null })).toThrow(
      expect.objectContaining({
        fix: 'Please log in again.',
        message: 'Unauthorized',
        status: 401,
      }),
    );
  });

  it('throws 401 when session has no user', () => {
    expect(() =>
      requireUserId({ session: { session: {} as never, user: null as never } }),
    ).toThrow(
      expect.objectContaining({
        fix: 'Please log in again.',
        message: 'Unauthorized',
        status: 401,
      }),
    );
  });

  it('throws 401 when user has no id', () => {
    expect(() =>
      requireUserId({
        session: { session: {} as never, user: { id: undefined } as never },
      }),
    ).toThrow(
      expect.objectContaining({
        fix: 'Please log in again.',
        message: 'Unauthorized',
        status: 401,
      }),
    );
  });
});
