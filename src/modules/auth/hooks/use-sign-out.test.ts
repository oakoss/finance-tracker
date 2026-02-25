import { act, renderHook } from '@testing-library/react';

import { useSignOut } from './use-sign-out';

const mockNavigate = vi.fn();
const mockPostMessage = vi.fn(() => true);
const mockSignOut = vi.fn();

vi.mock('@tanstack/react-router', () => ({
  useRouter: () => ({
    navigate: mockNavigate,
  }),
}));

vi.mock('@/hooks/use-broadcast-channel', () => ({
  useBroadcastChannel: (
    _name: string,
    options?: { onMessage?: (data: string) => void },
  ) => {
    // Store the onMessage handler so tests can invoke it
    onMessageHandler = options?.onMessage ?? null;
    return { isSupported: true, postMessage: mockPostMessage };
  },
}));

vi.mock('@/lib/auth-client', () => ({
  authClient: {
    signOut: (...args: unknown[]) => mockSignOut(...args),
  },
}));

vi.mock('@/lib/logging/client-logger', () => ({
  clientLog: {
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

let onMessageHandler: ((data: string) => void) | null = null;

describe('useSignOut', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockPostMessage.mockClear().mockReturnValue(true);
    mockSignOut.mockClear().mockResolvedValue({});
    onMessageHandler = null;
  });

  it('returns a signOut function', () => {
    const { result } = renderHook(() => useSignOut());
    expect(typeof result.current).toBe('function');
  });

  it('calls authClient.signOut and navigates to /login on success', async () => {
    const { result } = renderHook(() => useSignOut());

    await act(async () => {
      result.current();
      // Flush the promise chain
      await vi.waitFor(() => {
        expect(mockNavigate).toHaveBeenCalled();
      });
    });

    expect(mockSignOut).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith({ to: '/login' });
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

  it('navigates to /login even when signOut API fails', async () => {
    mockSignOut.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useSignOut());

    await act(async () => {
      result.current();
      await vi.waitFor(() => {
        expect(mockNavigate).toHaveBeenCalled();
      });
    });

    expect(mockNavigate).toHaveBeenCalledWith({ to: '/login' });
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

  it('navigates to /login when receiving sign-out from another tab', () => {
    renderHook(() => useSignOut());

    act(() => {
      onMessageHandler?.('sign-out');
    });

    expect(mockNavigate).toHaveBeenCalledWith({ to: '/login' });
  });

  it('ignores non-sign-out messages from broadcast channel', () => {
    renderHook(() => useSignOut());

    act(() => {
      onMessageHandler?.('something-else');
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
