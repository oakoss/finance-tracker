import {
  requireUserId,
  requireVerifiedSession,
} from '@/modules/auth/middleware';

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

describe('requireVerifiedSession', () => {
  it('passes when session has a verified user', () => {
    expect(() =>
      requireVerifiedSession({
        session: {} as never,
        user: { emailVerified: true, id: 'user-123' } as never,
      }),
    ).not.toThrow();
  });

  it('throws 401 when session is null', () => {
    expect(() => requireVerifiedSession(null)).toThrow(
      expect.objectContaining({ message: 'Unauthorized', status: 401 }),
    );
  });

  it('throws 401 when session has no user', () => {
    expect(() =>
      requireVerifiedSession({ session: {} as never, user: null as never }),
    ).toThrow(
      expect.objectContaining({ message: 'Unauthorized', status: 401 }),
    );
  });

  it('throws 403 when user email is not verified', () => {
    expect(() =>
      requireVerifiedSession({
        session: {} as never,
        user: { emailVerified: false, id: 'user-123' } as never,
      }),
    ).toThrow(
      expect.objectContaining({
        message: 'Please verify your email before making changes.',
        status: 403,
        why: 'This action is blocked until your email is verified.',
      }),
    );
  });

  it('throws 403 when emailVerified is undefined', () => {
    expect(() =>
      requireVerifiedSession({
        session: {} as never,
        user: { emailVerified: undefined, id: 'user-123' } as never,
      }),
    ).toThrow(expect.objectContaining({ status: 403 }));
  });
});
