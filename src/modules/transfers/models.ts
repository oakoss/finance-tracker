import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from 'drizzle-arktype';

import { transferDismissals, transfers } from '@/modules/transfers/db/schema';

export const transfersSelectSchema = createSelectSchema(transfers);
export const transfersInsertSchema = createInsertSchema(transfers);
export const transfersUpdateSchema = createUpdateSchema(transfers);
export const transfersDeleteSchema = transfersSelectSchema.pick('id');

export const transferDismissalsSelectSchema =
  createSelectSchema(transferDismissals);
export const transferDismissalsInsertSchema =
  createInsertSchema(transferDismissals);
export const transferDismissalsUpdateSchema =
  createUpdateSchema(transferDismissals);
export const transferDismissalsDeleteSchema =
  transferDismissalsSelectSchema.pick('id');

export type Transfer = typeof transfersSelectSchema.infer;
export type TransferInsert = typeof transfersInsertSchema.infer;
export type TransferConfidence = Transfer['confidence'];

export type TransferDismissal = typeof transferDismissalsSelectSchema.infer;
export type TransferDismissalInsert =
  typeof transferDismissalsInsertSchema.infer;
