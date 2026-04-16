import type { User, UserInsert } from '@/modules/auth/models';
import type { MerchantRule, MerchantRuleInsert } from '@/modules/rules/models';

import type { Db } from '~test/factories/base';
import { insertMerchantRule } from '~test/factories/merchant-rule.factory';
import { insertUser } from '~test/factories/user.factory';

type MerchantRuleWithUser = { rule: MerchantRule; user: User };

type MerchantRuleWithUserOverrides = {
  rule?: Omit<Partial<MerchantRuleInsert>, 'userId'>;
  user?: Partial<UserInsert>;
};

export async function insertMerchantRuleWithUser(
  db: Db,
  overrides?: MerchantRuleWithUserOverrides,
): Promise<MerchantRuleWithUser> {
  const user = await insertUser(db, overrides?.user);
  const rule = await insertMerchantRule(db, {
    userId: user.id,
    ...overrides?.rule,
  });
  return { rule, user };
}
