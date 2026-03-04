import type { User, UserInsert } from '@/modules/auth/models';
import type { Category, CategoryInsert } from '@/modules/categories/models';
import type { Db } from '~test/factories/base';

import { insertCategory } from '~test/factories/category.factory';
import { insertUser } from '~test/factories/user.factory';

type CategoryWithUser = {
  category: Category;
  user: User;
};

type CategoryWithUserOverrides = {
  category?: Omit<Partial<CategoryInsert>, 'userId'>;
  user?: Partial<UserInsert>;
};

export async function insertCategoryWithUser(
  db: Db,
  overrides?: CategoryWithUserOverrides,
): Promise<CategoryWithUser> {
  const user = await insertUser(db, overrides?.user);
  const category = await insertCategory(db, {
    userId: user.id,
    ...overrides?.category,
  });
  return { category, user };
}
