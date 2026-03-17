import { act, renderHook } from '@testing-library/react';

import { useSignOut } from './use-sign-out';

const mockNavigate = vi.fn();
const mockPostMessage = vi.fn(() => true);
const mockSignOut = vi.fn();

vi.mock('@tanstack/react-router', () => ({
  useRouter: () => ({ navigate: mockNavigate }),
}));

const mockUseBroadcastChannel = vi.fn(
  (..._args: unknown[]) =>
    ({ isSupported: true, postMessage: mockPostMessage }) as const,
);

vi.mock('@/hooks/use-broadcast-channel', () => ({
  useBroadcastChannel: (...args: unknown[]) => mockUseBroadcastChannel(...args),
}));

vi.mock('@/lib/auth/client', () => ({
  authClient: { signOut: (...args: unknown[]) => mockSignOut(...args) },
}));

vi.mock('@/lib/logging/client-logger', () => ({
  clientLog: { error: vi.fn(), warn: vi.fn() },
}));

const mockToastWarning = vi.fn();

vi.mock('sonner', () => ({
  toast: { warning: (...args: unknown[]) => mockToastWarning(...args) },
}));

vi.mock('@/paraglide/messages', () => ({
  m: new Proxy({}, { get: (_target, key: string) => () => key }),
}));

describe('useSignOut', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockUseBroadcastChannel.mockClear();
    mockPostMessage.mockClear().mockReturnValue(true);
    mockSignOut.mockClear().mockResolvedValue({});
    mockToastWarning.mockClear();
  });

  it('returns a signOut function', () => {
    const { result } = renderHook(() => useSignOut());
    expect(typeof result.current).toBe('function');
  });

  it('calls authClient.signOut and navigates to /sign-in on success', async () => {
    const { result } = renderHook(() => useSignOut());

    await act(async () => {
      result.current();
      // Flush the promise chain
      await vi.waitFor(() => {
        expect(mockNavigate).toHaveBeenCalled();
      });
    });

    expect(mockSignOut).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith({ to: '/sign-in' });
  });

  it('broadcasts sign-out message on success', async () => {
    const { result } = renderHook(() => useSignOut());

    await act(async () => {
      result.current();
      await vi.waitFor(() => {
        expect(mockPostMessage).toHaveBeenCalled();
      });
    });

    expect(mockPostMessage).toHaveBeenCalledWith('sign-out');
  });

  it('navigates to /sign-in even when signOut API fails', async () => {
    mockSignOut.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useSignOut());

    await act(async () => {
      result.current();
      await vi.waitFor(() => {
        expect(mockNavigate).toHaveBeenCalled();
      });
    });

    expect(mockNavigate).toHaveBeenCalledWith({ to: '/sign-in' });
  });

  it('logs error when signOut API fails', async () => {
    const { clientLog } = await import('@/lib/logging/client-logger');
    mockSignOut.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useSignOut());

    await act(async () => {
      result.current();
      await vi.waitFor(() => {
        expect(clientLog.error).toHaveBeenCalled();
      });
    });

    expect(clientLog.error).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'auth.signOut' }),
    );
  });

  it('shows toast warning when signOut API fails', async () => {
    mockSignOut.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useSignOut());

    await act(async () => {
      result.current();
      await vi.waitFor(() => {
        expect(mockToastWarning).toHaveBeenCalled();
      });
    });

    expect(mockToastWarning).toHaveBeenCalledWith(
      'auth.error.signOutIncomplete',
    );
  });

  it('does not register an onMessage handler (listener lives in useSignOutListener)', () => {
    renderHook(() => useSignOut());
    expect(mockUseBroadcastChannel).toHaveBeenCalledWith('auth');
    expect(mockUseBroadcastChannel).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ onMessage: expect.any(Function) }),
    );
  });

  it('warns when broadcast fails', async () => {
    const { clientLog } = await import('@/lib/logging/client-logger');
    mockPostMessage.mockReturnValue(false);

    const { result } = renderHook(() => useSignOut());

    await act(async () => {
      result.current();
      await vi.waitFor(() => {
        expect(clientLog.warn).toHaveBeenCalled();
      });
    });

    expect(clientLog.warn).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'auth.signOut.broadcast' }),
    );
  });
});
