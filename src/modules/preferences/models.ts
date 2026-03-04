import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from 'drizzle-arktype';

import { userPreferences } from '@/modules/preferences/db/schema';

export const userPreferencesSelectSchema = createSelectSchema(userPreferences);
export const userPreferencesInsertSchema = createInsertSchema(userPreferences);
export const userPreferencesUpdateSchema = createUpdateSchema(userPreferences);
export const userPreferencesDeleteSchema =
  userPreferencesSelectSchema.pick('userId');

export type UserPreferences = typeof userPreferencesSelectSchema.infer;
export type UserPreferencesInsert = typeof userPreferencesInsertSchema.infer;
