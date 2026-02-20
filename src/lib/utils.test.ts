import { cn } from './utils';

describe('cn', () => {
  it('merges simple class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('handles conditional classes', () => {
    const isHidden = false;
    expect(cn('base', isHidden && 'hidden', 'visible')).toBe('base visible');
  });

  it('deduplicates tailwind conflicts (twMerge)', () => {
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4');
  });

  it('handles undefined and null inputs', () => {
    expect(cn('base', undefined, null, 'end')).toBe('base end');
  });

  it('handles array inputs (clsx)', () => {
    expect(cn(['foo', 'bar'], 'baz')).toBe('foo bar baz');
  });

  it('handles object inputs (clsx)', () => {
    expect(cn({ hidden: true, visible: false })).toBe('hidden');
  });

  it('returns empty string for no inputs', () => {
    expect(cn()).toBe('');
  });

  it('resolves tailwind responsive conflicts', () => {
    expect(cn('text-sm md:text-lg', 'text-base')).toBe('md:text-lg text-base');
  });
});
