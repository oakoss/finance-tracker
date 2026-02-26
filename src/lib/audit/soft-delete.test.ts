// @vitest-environment node

import { getTableColumns, is, isNull, SQL, sql } from 'drizzle-orm';
import { pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';

import { notDeleted } from './soft-delete';

const testTable = pgTable('test_table', {
  deletedAt: timestamp({ withTimezone: true }),
  id: uuid()
    .primaryKey()
    .default(sql`uuidv7()`),
});

describe('notDeleted', () => {
  it('returns an isNull SQL expression for the deletedAt column', () => {
    const columns = getTableColumns(testTable);
    const result = notDeleted(columns.deletedAt);

    expect(is(result, SQL)).toBe(true);

    const direct = isNull(columns.deletedAt);
    expect(result).toEqual(direct);
  });

  it('works with any table that has a deletedAt column', () => {
    const anotherTable = pgTable('another_table', {
      deletedAt: timestamp({ withTimezone: true }),
      id: uuid()
        .primaryKey()
        .default(sql`uuidv7()`),
    });

    const columns = getTableColumns(anotherTable);
    const result = notDeleted(columns.deletedAt);

    expect(is(result, SQL)).toBe(true);
  });
});
