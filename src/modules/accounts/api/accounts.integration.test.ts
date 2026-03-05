import { expect } from 'vitest';

import { creditCardCatalog } from '@/db/schema';
import { insertCreditCardCatalog } from '~test/factories/credit-card-catalog.factory';
import { test } from '~test/integration-setup';

// ---------------------------------------------------------------------------
// Credit card catalog (no service — simple read)
// ---------------------------------------------------------------------------

test('get-credit-card-catalog — returns sorted by issuer + name', async ({
  db,
}) => {
  await insertCreditCardCatalog(db, { issuer: 'Chase', name: 'Sapphire' });
  await insertCreditCardCatalog(db, { issuer: 'Amex', name: 'Gold' });
  await insertCreditCardCatalog(db, { issuer: 'Chase', name: 'Freedom' });

  const rows = await db
    .select()
    .from(creditCardCatalog)
    .orderBy(creditCardCatalog.issuer, creditCardCatalog.name);

  expect(rows.length).toBeGreaterThanOrEqual(3);
  expect(rows[0].issuer).toBe('Amex');
  expect(rows[1].issuer).toBe('Chase');
  expect(rows[1].name).toBe('Freedom');
  expect(rows[2].name).toBe('Sapphire');
});
