import { act, renderHook } from '@testing-library/react';

import { useCopyToClipboard } from './use-copy-to-clipboard';

vi.mock('@/lib/logging/client-logger', () => ({
  clientLog: {
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

const mockWriteText = vi.fn();

describe('useCopyToClipboard', () => {
  beforeEach(() => {
    mockWriteText.mockReset();
    Object.assign(navigator, {
      clipboard: { writeText: mockWriteText },
    });
  });

  it('starts with copied: false', () => {
    const { result } = renderHook(() => useCopyToClipboard());
    expect(result.current.copied).toBe(false);
  });

  it('calls writeText with the given value', async () => {
    mockWriteText.mockResolvedValue('ok');
    const { result } = renderHook(() => useCopyToClipboard());

    act(() => {
      result.current.copy('hello');
    });
    await vi.waitFor(() => {
      expect(mockWriteText).toHaveBeenCalledWith('hello');
    });
  });

  it('sets copied to true on success', async () => {
    mockWriteText.mockResolvedValue('ok');
    const { result } = renderHook(() => useCopyToClipboard());

    act(() => {
      result.current.copy('test');
    });
    await vi.waitFor(() => {
      expect(result.current.copied).toBe(true);
    });
  });

  it('resets copied to false after timeout', async () => {
    vi.useFakeTimers();
    mockWriteText.mockReturnValue(Promise.resolve());
    const { result } = renderHook(() => useCopyToClipboard({ timeout: 500 }));

    act(() => {
      result.current.copy('test');
    });
    // Flush the microtask (promise resolution)
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(result.current.copied).toBe(true);

    await act(() => vi.advanceTimersByTimeAsync(499));
    expect(result.current.copied).toBe(true);

    await act(() => vi.advanceTimersByTimeAsync(1));
    expect(result.current.copied).toBe(false);
    vi.useRealTimers();
  });

  it('logs error when writeText rejects', async () => {
    const { clientLog } = await import('@/lib/logging/client-logger');
    mockWriteText.mockRejectedValue(new DOMException('Not focused'));

    const { result } = renderHook(() => useCopyToClipboard());

    act(() => {
      result.current.copy('test');
    });
    await vi.waitFor(() => {
      expect(clientLog.error).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'clipboard.copy' }),
      );
    });

    expect(result.current.copied).toBe(false);
  });

  it('warns when clipboard API is unavailable', async () => {
    const { clientLog } = await import('@/lib/logging/client-logger');
    Object.assign(navigator, { clipboard: null });

    const { result } = renderHook(() => useCopyToClipboard());

    act(() => {
      result.current.copy('test');
    });

    expect(mockWriteText).not.toHaveBeenCalled();
    expect(clientLog.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'clipboard.copy',
        outcome: expect.objectContaining({ reason: 'unsupported' }),
      }),
    );
  });

  it('clears previous timeout when copying again quickly', async () => {
    vi.useFakeTimers();
    mockWriteText.mockReturnValue(Promise.resolve());
    const { result } = renderHook(() => useCopyToClipboard({ timeout: 1000 }));

    act(() => {
      result.current.copy('first');
    });
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(result.current.copied).toBe(true);

    await act(() => vi.advanceTimersByTimeAsync(800));
    expect(result.current.copied).toBe(true);

    act(() => {
      result.current.copy('second');
    });
    await act(() => vi.advanceTimersByTimeAsync(0));

    // 800ms after second copy — still within new timeout
    await act(() => vi.advanceTimersByTimeAsync(800));
    expect(result.current.copied).toBe(true);

    // 200ms more completes the second timeout
    await act(() => vi.advanceTimersByTimeAsync(200));
    expect(result.current.copied).toBe(false);
    vi.useRealTimers();
  });

  it('cleans up timeout on unmount', async () => {
    mockWriteText.mockResolvedValue('ok');
    const { result, unmount } = renderHook(() => useCopyToClipboard());

    act(() => {
      result.current.copy('test');
    });
    await vi.waitFor(() => {
      expect(result.current.copied).toBe(true);
    });

    // Unmount should clear the pending timeout without errors
    unmount();
  });
});
