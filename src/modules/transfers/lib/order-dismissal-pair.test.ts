import { orderDismissalPair } from '@/modules/transfers/lib/order-dismissal-pair';

describe('orderDismissalPair', () => {
  it('returns the same shape regardless of input order', () => {
    expect(orderDismissalPair('a', 'b')).toEqual({ txnAId: 'a', txnBId: 'b' });
    expect(orderDismissalPair('b', 'a')).toEqual({ txnAId: 'a', txnBId: 'b' });
  });

  it('orders realistic UUIDv7 strings lexicographically', () => {
    // Two real-shape UUIDv7s differing in the timestamp prefix. Same-
    // length lex compare is the contract; pin it with realistic input.
    const earlier = '0190b6e3-1234-7000-8000-000000000001';
    const later = '0190b6e4-1234-7000-8000-000000000001';
    expect(orderDismissalPair(later, earlier)).toEqual({
      txnAId: earlier,
      txnBId: later,
    });
  });

  it('throws when both ids are equal', () => {
    expect(() => orderDismissalPair('x', 'x')).toThrow(/paired with itself/i);
  });
});
