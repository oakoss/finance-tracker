import { act, renderHook } from '@testing-library/react';

import { useBroadcastChannel } from './use-broadcast-channel';

vi.mock('@/lib/logging/client-logger', () => ({
  clientLog: { error: vi.fn(), warn: vi.fn() },
}));

const mockClose = vi.fn();
const mockPostMessage = vi.fn();
const mockRemoveEventListener = vi.fn();

let messageHandler: ((event: MessageEvent) => void) | null = null;
let messageErrorHandler: ((event: MessageEvent) => void) | null = null;

const captureHandler = (
  event: string,
  handler: (...args: unknown[]) => void,
) => {
  if (event === 'message') {
    messageHandler = handler as (event: MessageEvent) => void;
  } else if (event === 'messageerror') {
    messageErrorHandler = handler as (event: MessageEvent) => void;
  }
};

class MockBroadcastChannel {
  name: string;
  constructor(name: string) {
    this.name = name;
  }
  addEventListener = vi.fn(captureHandler);
  removeEventListener = mockRemoveEventListener;
  postMessage = mockPostMessage;
  close = mockClose;
}

describe('useBroadcastChannel', () => {
  beforeEach(() => {
    vi.stubGlobal('BroadcastChannel', MockBroadcastChannel);
    messageHandler = null;
    messageErrorHandler = null;
    mockClose.mockClear();
    mockPostMessage.mockClear();
    mockRemoveEventListener.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns isSupported: true when BroadcastChannel exists', () => {
    const { result } = renderHook(() => useBroadcastChannel('test'));
    expect(result.current.isSupported).toBe(true);
  });

  it('posts messages via postMessage', () => {
    const { result } = renderHook(() => useBroadcastChannel<string>('test'));

    let sent = false;
    act(() => {
      sent = result.current.postMessage('hello');
    });

    expect(mockPostMessage).toHaveBeenCalledWith('hello');
    expect(sent).toBe(true);
  });

  it('returns false from postMessage when constructor fails at runtime', () => {
    // oxlint-disable-next-line unicorn/no-useless-undefined -- stubGlobal requires 2 args
    vi.stubGlobal('BroadcastChannel', undefined);

    const { result } = renderHook(() => useBroadcastChannel<string>('test'));

    let sent = true;
    act(() => {
      sent = result.current.postMessage('hello');
    });

    expect(mockPostMessage).not.toHaveBeenCalled();
    expect(sent).toBe(false);
  });

  it('calls onMessage when a message is received', () => {
    const handler = vi.fn();
    renderHook(() =>
      useBroadcastChannel<string>('test', { onMessage: handler }),
    );

    act(() => {
      messageHandler?.({ data: 'world' } as MessageEvent);
    });

    expect(handler).toHaveBeenCalledWith('world');
  });

  it('does not throw when a message arrives with no onMessage handler', () => {
    renderHook(() => useBroadcastChannel('test'));

    expect(() => {
      act(() => {
        messageHandler?.({ data: 'anything' } as MessageEvent);
      });
    }).not.toThrow();
  });

  it('catches onMessage callback errors', async () => {
    const { clientLog } = await import('@/lib/logging/client-logger');
    const handler = vi.fn(() => {
      throw new Error('callback failed');
    });

    renderHook(() =>
      useBroadcastChannel<string>('test', { onMessage: handler }),
    );

    act(() => {
      messageHandler?.({ data: 'boom' } as MessageEvent);
    });

    expect(handler).toHaveBeenCalledWith('boom');
    expect(clientLog.error).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'broadcastChannel.onMessage' }),
    );
  });

  it('logs messageerror events with origin', async () => {
    const { clientLog } = await import('@/lib/logging/client-logger');
    renderHook(() => useBroadcastChannel('test'));

    act(() => {
      messageErrorHandler?.({ origin: 'http://localhost' } as MessageEvent);
    });

    expect(clientLog.error).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'broadcastChannel.messageError',
        outcome: expect.objectContaining({ origin: 'http://localhost' }),
      }),
    );
  });

  it('catches postMessage errors and returns false', async () => {
    const { clientLog } = await import('@/lib/logging/client-logger');
    mockPostMessage.mockImplementation(() => {
      throw new DOMException('DataCloneError');
    });

    const { result } = renderHook(() => useBroadcastChannel<string>('test'));

    let sent = true;
    act(() => {
      sent = result.current.postMessage('bad data');
    });

    expect(sent).toBe(false);
    expect(clientLog.error).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'broadcastChannel.postMessage' }),
    );
  });

  it('logs and recovers when constructor throws', async () => {
    const { clientLog } = await import('@/lib/logging/client-logger');
    vi.stubGlobal(
      'BroadcastChannel',
      class {
        constructor() {
          throw new DOMException('SecurityError');
        }
      },
    );

    const { result } = renderHook(() => useBroadcastChannel('test'));

    expect(result.current.isSupported).toBe(true);
    expect(clientLog.error).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'broadcastChannel.init' }),
    );

    let sent = true;
    act(() => {
      sent = result.current.postMessage('hello');
    });
    expect(sent).toBe(false);
  });

  it('closes the channel on unmount', () => {
    const { unmount } = renderHook(() => useBroadcastChannel('test'));
    unmount();
    expect(mockClose).toHaveBeenCalled();
  });

  it('returns false from postMessage after unmount', () => {
    const { result, unmount } = renderHook(() =>
      useBroadcastChannel<string>('test'),
    );
    unmount();

    let sent = true;
    act(() => {
      sent = result.current.postMessage('after-unmount');
    });

    expect(mockPostMessage).not.toHaveBeenCalled();
    expect(sent).toBe(false);
  });

  it('removes event listeners with matching handler references on unmount', () => {
    const { unmount } = renderHook(() => useBroadcastChannel('test'));
    unmount();

    expect(mockRemoveEventListener).toHaveBeenCalledTimes(2);
    expect(mockRemoveEventListener).toHaveBeenCalledWith(
      'message',
      messageHandler,
    );
    expect(mockRemoveEventListener).toHaveBeenCalledWith(
      'messageerror',
      messageErrorHandler,
    );
  });

  it('recreates the channel when channelName changes', () => {
    const { rerender } = renderHook(({ name }) => useBroadcastChannel(name), {
      initialProps: { name: 'channel-a' },
    });

    expect(mockClose).not.toHaveBeenCalled();

    rerender({ name: 'channel-b' });

    expect(mockClose).toHaveBeenCalledOnce();
  });

  it('uses latest onMessage without re-subscribing', () => {
    const first = vi.fn();
    const second = vi.fn();

    const { rerender } = renderHook(
      ({ handler }) =>
        useBroadcastChannel<string>('test', { onMessage: handler }),
      { initialProps: { handler: first } },
    );

    rerender({ handler: second });

    act(() => {
      messageHandler?.({ data: 'latest' } as MessageEvent);
    });

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledWith('latest');
  });
});
