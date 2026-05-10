/**
 * Stores the pair in canonical order (`txnAId < txnBId`). The DB
 * enforces this with a CHECK — always insert through this helper.
 */
export type OrderedDismissalPair = {
  readonly txnAId: string;
  readonly txnBId: string;
} & { readonly __brand: 'OrderedDismissalPair' };

export function orderDismissalPair(a: string, b: string): OrderedDismissalPair {
  if (a === b) {
    throw new Error('Cannot dismiss a transaction paired with itself.');
  }
  const ordered = a < b ? { txnAId: a, txnBId: b } : { txnAId: b, txnBId: a };
  return ordered as OrderedDismissalPair;
}
