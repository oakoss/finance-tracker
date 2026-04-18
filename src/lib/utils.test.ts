import { cn, omit } from './utils';

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

describe('omit', () => {
  it('removes a single key', () => {
    expect(omit({ a: 1, b: 2, c: 3 }, 'b')).toEqual({ a: 1, c: 3 });
  });

  it('removes multiple keys', () => {
    expect(omit({ a: 1, b: 2, c: 3, d: 4 }, 'b', 'd')).toEqual({ a: 1, c: 3 });
  });

  it('returns a new object (does not mutate input)', () => {
    const input = { a: 1, b: 2 };
    const result = omit(input, 'a');
    expect(input).toEqual({ a: 1, b: 2 });
    expect(result).not.toBe(input);
  });

  it('is a no-op when no keys are passed', () => {
    expect(omit({ a: 1, b: 2 })).toEqual({ a: 1, b: 2 });
  });

  it('ignores keys that do not exist on the object', () => {
    const input: { a: number; b?: number } = { a: 1 };
    expect(omit(input, 'b')).toEqual({ a: 1 });
  });

  it('removes the key from the result, not just sets it to undefined', () => {
    type Shape = { id: string; note?: string; tag?: string };
    const input: Shape = { id: '1', note: 'hi', tag: 't1' };
    const result = omit(input, 'note');
    expect(result).toEqual({ id: '1', tag: 't1' });
    expect('note' in result).toBe(false);
  });
});
