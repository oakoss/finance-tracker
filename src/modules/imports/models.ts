import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from 'drizzle-arktype';

import { importRows, imports } from '@/modules/imports/db/schema';

export const importsSelectSchema = createSelectSchema(imports);
export const importsInsertSchema = createInsertSchema(imports);
export const importsUpdateSchema = createUpdateSchema(imports);
export const importsDeleteSchema = importsSelectSchema.pick('id');

export type Import = typeof importsSelectSchema.infer;
export type ImportInsert = typeof importsInsertSchema.infer;

export const importRowsSelectSchema = createSelectSchema(importRows);
export const importRowsInsertSchema = createInsertSchema(importRows);
export const importRowsUpdateSchema = createUpdateSchema(importRows);
export const importRowsDeleteSchema = importRowsSelectSchema.pick('id');

export type ImportRow = typeof importRowsSelectSchema.infer;
export type ImportRowInsert = typeof importRowsInsertSchema.infer;
