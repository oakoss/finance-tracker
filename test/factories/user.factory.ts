import { faker } from '@faker-js/faker';

import {
  users,
  type usersInsertSchema,
  type usersSelectSchema,
} from '@/db/schema';
import { type Db, fakeDate, fakeId } from '~test/factories/base';

type User = typeof usersSelectSchema.infer;
type UserInsert = typeof usersInsertSchema.infer;

export function createUser(overrides?: Partial<User>): User {
  const now = fakeDate();
  return {
    createdAt: now,
    email: faker.internet.email(),
    emailVerified: false,
    id: fakeId(),
    image: faker.image.avatar(),
    name: faker.person.fullName(),
    updatedAt: now,
    ...overrides,
  };
}

export async function insertUser(
  db: Db,
  overrides?: Partial<UserInsert>,
): Promise<User> {
  const data: UserInsert = {
    email: faker.internet.email(),
    name: faker.person.fullName(),
    ...overrides,
  };
  const [row] = await db.insert(users).values(data).returning();
  return row;
}
