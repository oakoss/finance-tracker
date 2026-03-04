import { toSelectItems } from './form';

describe('toSelectItems', () => {
  it('maps enum values to labels', () => {
    const result = toSelectItems(['sm', 'md', 'lg'] as const, (v) =>
      v.toUpperCase(),
    );
    expect(result).toEqual({ lg: 'LG', md: 'MD', sm: 'SM' });
  });

  it('returns empty record for empty values', () => {
    expect(toSelectItems([], () => '')).toEqual({});
  });
});
