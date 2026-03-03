import { renderHook } from '@testing-library/react';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';

import { useHydrated, useHydratedAttribute } from './use-hydrated';

describe('useHydrated', () => {
  it('returns true in a client environment', () => {
    const { result } = renderHook(() => useHydrated());

    expect(result.current).toBe(true);
  });

  it('returns false during SSR', () => {
    function Probe() {
      const hydrated = useHydrated();
      return createElement('span', null, String(hydrated));
    }

    const html = renderToString(createElement(Probe));

    expect(html).toContain('false');
  });
});

describe('useHydratedAttribute', () => {
  afterEach(() => {
    delete document.body.dataset.hydrated;
  });

  it('sets data-hydrated on document.body', () => {
    renderHook(() => useHydratedAttribute());

    expect(document.body.dataset.hydrated).toBe('');
  });

  it('removes data-hydrated on unmount', () => {
    const { unmount } = renderHook(() => useHydratedAttribute());

    expect(document.body.dataset.hydrated).toBe('');

    unmount();

    expect(document.body.dataset.hydrated).toBeUndefined();
  });
});
