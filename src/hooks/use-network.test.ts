import { act, renderHook } from '@testing-library/react';

import { useNetwork } from './use-network';

describe('useNetwork', () => {
  const originalOnLine = navigator.onLine;

  afterEach(() => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: originalOnLine,
      writable: true,
    });
  });

  it('returns online: true when navigator.onLine is true', () => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: true,
      writable: true,
    });
    const { result } = renderHook(() => useNetwork());
    expect(result.current.online).toBe(true);
  });

  it('returns online: false when navigator.onLine is false', () => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: false,
      writable: true,
    });
    const { result } = renderHook(() => useNetwork());
    expect(result.current.online).toBe(false);
  });

  it('updates when offline event fires', () => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: true,
      writable: true,
    });
    const { result } = renderHook(() => useNetwork());
    expect(result.current.online).toBe(true);

    act(() => {
      Object.defineProperty(navigator, 'onLine', {
        configurable: true,
        value: false,
        writable: true,
      });
      globalThis.dispatchEvent(new Event('offline'));
    });
    expect(result.current.online).toBe(false);
  });

  it('updates when online event fires', () => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: false,
      writable: true,
    });
    const { result } = renderHook(() => useNetwork());
    expect(result.current.online).toBe(false);

    act(() => {
      Object.defineProperty(navigator, 'onLine', {
        configurable: true,
        value: true,
        writable: true,
      });
      globalThis.dispatchEvent(new Event('online'));
    });
    expect(result.current.online).toBe(true);
  });
});
