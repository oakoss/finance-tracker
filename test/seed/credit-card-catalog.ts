import type { CreditCardCatalog } from '@/modules/accounts/models';

import { creditCardCatalog } from '@/db/schema';
import type { Db } from '~test/factories/base';

const CATALOG = [
  {
    annualFeeCents: 9500,
    defaultAprBps: 2174,
    issuer: 'Chase',
    name: 'Sapphire Preferred',
    network: 'Visa',
    rewardsType: 'points',
  },
  {
    annualFeeCents: 0,
    defaultAprBps: 2024,
    issuer: 'Chase',
    name: 'Freedom Unlimited',
    network: 'Visa',
    rewardsType: 'cashback',
  },
  {
    annualFeeCents: 0,
    defaultAprBps: 2024,
    issuer: 'Chase',
    name: 'Freedom Flex',
    network: 'Visa',
    rewardsType: 'cashback',
  },
  {
    annualFeeCents: 55_000,
    defaultAprBps: 2174,
    issuer: 'Chase',
    name: 'Sapphire Reserve',
    network: 'Visa',
    rewardsType: 'points',
  },
  {
    annualFeeCents: 25_000,
    defaultAprBps: 2224,
    issuer: 'American Express',
    name: 'Gold Card',
    network: 'Amex',
    rewardsType: 'points',
  },
  {
    annualFeeCents: 69_500,
    defaultAprBps: 2224,
    issuer: 'American Express',
    name: 'Platinum Card',
    network: 'Amex',
    rewardsType: 'points',
  },
  {
    annualFeeCents: 0,
    defaultAprBps: 1974,
    issuer: 'American Express',
    name: 'Blue Cash Everyday',
    network: 'Amex',
    rewardsType: 'cashback',
  },
  {
    annualFeeCents: 9500,
    defaultAprBps: 1974,
    issuer: 'American Express',
    name: 'Blue Cash Preferred',
    network: 'Amex',
    rewardsType: 'cashback',
  },
  {
    annualFeeCents: 0,
    defaultAprBps: 1849,
    issuer: 'Citi',
    name: 'Double Cash',
    network: 'Mastercard',
    rewardsType: 'cashback',
  },
  {
    annualFeeCents: 9500,
    defaultAprBps: 2049,
    issuer: 'Citi',
    name: 'Premier',
    network: 'Mastercard',
    rewardsType: 'points',
  },
  {
    annualFeeCents: 0,
    defaultAprBps: 1699,
    issuer: 'Discover',
    name: 'it Cash Back',
    network: 'Discover',
    rewardsType: 'cashback',
  },
  {
    annualFeeCents: 0,
    defaultAprBps: 1699,
    issuer: 'Discover',
    name: 'it Miles',
    network: 'Discover',
    rewardsType: 'miles',
  },
  {
    annualFeeCents: 9500,
    defaultAprBps: 2174,
    issuer: 'Capital One',
    name: 'Venture Rewards',
    network: 'Visa',
    rewardsType: 'miles',
  },
  {
    annualFeeCents: 39_500,
    defaultAprBps: 2174,
    issuer: 'Capital One',
    name: 'Venture X Rewards',
    network: 'Visa',
    rewardsType: 'miles',
  },
  {
    annualFeeCents: 0,
    defaultAprBps: 1974,
    issuer: 'Capital One',
    name: 'Quicksilver Cash Rewards',
    network: 'Visa',
    rewardsType: 'cashback',
  },
  {
    annualFeeCents: 0,
    defaultAprBps: 1999,
    issuer: 'Capital One',
    name: 'SavorOne Cash Rewards',
    network: 'Visa',
    rewardsType: 'cashback',
  },
  {
    annualFeeCents: 0,
    defaultAprBps: 1699,
    issuer: 'Bank of America',
    name: 'Customized Cash Rewards',
    network: 'Visa',
    rewardsType: 'cashback',
  },
  {
    annualFeeCents: 0,
    defaultAprBps: 1874,
    issuer: 'Wells Fargo',
    name: 'Active Cash',
    network: 'Visa',
    rewardsType: 'cashback',
  },
  {
    annualFeeCents: 0,
    defaultAprBps: 1874,
    issuer: 'Wells Fargo',
    name: 'Autograph',
    network: 'Visa',
    rewardsType: 'points',
  },
  {
    annualFeeCents: 0,
    defaultAprBps: 1749,
    issuer: 'US Bank',
    name: 'Cash+',
    network: 'Visa',
    rewardsType: 'cashback',
  },
] as const;

export async function seedCreditCardCatalog(
  db: Db,
): Promise<CreditCardCatalog[]> {
  const rows = await db
    .insert(creditCardCatalog)
    .values([...CATALOG])
    .onConflictDoNothing()
    .returning();

  console.log(`Seeded ${rows.length} credit card catalog entries`);
  return rows;
}
