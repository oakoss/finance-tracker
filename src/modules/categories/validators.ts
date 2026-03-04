import { type } from 'arktype';

import { categoryTypeEnum } from '@/modules/categories/db/schema';
import { categoriesDeleteSchema } from '@/modules/categories/models';

export const createCategorySchema = type({
  name: '0 < string <= 100',
  'parentId?': 'string > 0',
  type: type.enumerated(...categoryTypeEnum.enumValues),
});

export type CreateCategoryInput = typeof createCategorySchema.infer;

export const updateCategorySchema = type({
  id: 'string > 0',
  'name?': '0 < string <= 100',
  'parentId?': '(string > 0) | null',
  'type?': type.enumerated(...categoryTypeEnum.enumValues),
});

export type UpdateCategoryInput = typeof updateCategorySchema.infer;

export const deleteCategorySchema = categoriesDeleteSchema;

export type DeleteCategoryInput = typeof deleteCategorySchema.infer;
