import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from 'drizzle-arktype';

import { categories } from '@/modules/categories/db/schema';

export const categoriesSelectSchema = createSelectSchema(categories);
export const categoriesInsertSchema = createInsertSchema(categories);
export const categoriesUpdateSchema = createUpdateSchema(categories);
export const categoriesDeleteSchema = categoriesSelectSchema.pick('id');

export type Category = typeof categoriesSelectSchema.infer;
export type CategoryInsert = typeof categoriesInsertSchema.infer;
