import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from 'drizzle-arktype';

import { attachments, statements } from '@/modules/statements/db/schema';

export const statementsSelectSchema = createSelectSchema(statements);
export const statementsInsertSchema = createInsertSchema(statements);
export const statementsUpdateSchema = createUpdateSchema(statements);
export const statementsDeleteSchema = statementsSelectSchema.pick('id');

export type Statement = typeof statementsSelectSchema.infer;
export type StatementInsert = typeof statementsInsertSchema.infer;

export const attachmentsSelectSchema = createSelectSchema(attachments);
export const attachmentsInsertSchema = createInsertSchema(attachments);
export const attachmentsUpdateSchema = createUpdateSchema(attachments);
export const attachmentsDeleteSchema = attachmentsSelectSchema.pick('id');

export type Attachment = typeof attachmentsSelectSchema.infer;
export type AttachmentInsert = typeof attachmentsInsertSchema.infer;
