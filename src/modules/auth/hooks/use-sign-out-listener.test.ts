import { act, renderHook } from '@testing-library/react';

import { useSignOutListener } from './use-sign-out-listener';

const mockNavigate = vi.fn();
let onMessageHandler: ((data: string) => void) | null = null;

vi.mock('@tanstack/react-router', () => ({
  useRouter: () => ({ navigate: mockNavigate }),
}));

const mockUseBroadcastChannel = vi.fn((..._args: unknown[]) => {
  const options = _args[1] as
    | { onMessage?: (data: string) => void }
    | undefined;
  onMessageHandler = options?.onMessage ?? null;
  return { isSupported: true, postMessage: vi.fn() } as const;
});

vi.mock('@/hooks/use-broadcast-channel', () => ({
  useBroadcastChannel: (...args: unknown[]) => mockUseBroadcastChannel(...args),
}));

describe('useSignOutListener', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockUseBroadcastChannel.mockClear();
    onMessageHandler = null;
  });

  it('navigates to /sign-in when receiving sign-out broadcast', () => {
    renderHook(() => useSignOutListener());

    act(() => {
      onMessageHandler?.('sign-out');
    });

    expect(mockNavigate).toHaveBeenCalledWith({ to: '/sign-in' });
  });

  it('ignores non-sign-out messages', () => {
    renderHook(() => useSignOutListener());

    act(() => {
      onMessageHandler?.('something-else');
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
