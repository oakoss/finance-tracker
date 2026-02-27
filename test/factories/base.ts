import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

import { faker } from '@faker-js/faker';

import type * as schema from '@/db/schema';

export const FAKER_SEED = 42;

export const DATE_RANGE = {
  from: new Date('2024-01-01T00:00:00.000Z'),
  to: new Date('2024-12-31T23:59:59.999Z'),
};

export type Db = NodePgDatabase<typeof schema>;

export function fakeCents(min = 100, max = 100_000): number {
  return faker.number.int({ max, min });
}

export function fakeDate(): Date {
  return faker.date.between(DATE_RANGE);
}

export function fakeId(): string {
  return faker.string.uuid();
}
