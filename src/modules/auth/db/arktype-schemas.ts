import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from 'drizzle-arktype';

import {
  accounts,
  sessions,
  users,
  verifications,
} from '@/modules/auth/db/schema';

export const usersSelectSchema = createSelectSchema(users);
export const usersInsertSchema = createInsertSchema(users);
export const usersUpdateSchema = createUpdateSchema(users);

export const sessionsSelectSchema = createSelectSchema(sessions);
export const sessionsInsertSchema = createInsertSchema(sessions);
export const sessionsUpdateSchema = createUpdateSchema(sessions);

export const accountsSelectSchema = createSelectSchema(accounts);
export const accountsInsertSchema = createInsertSchema(accounts);
export const accountsUpdateSchema = createUpdateSchema(accounts);

export const verificationsSelectSchema = createSelectSchema(verifications);
export const verificationsInsertSchema = createInsertSchema(verifications);
export const verificationsUpdateSchema = createUpdateSchema(verifications);
