import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from 'drizzle-arktype';

import { transfers } from '@/modules/transfers/db/schema';

export const transfersSelectSchema = createSelectSchema(transfers);
export const transfersInsertSchema = createInsertSchema(transfers);
export const transfersUpdateSchema = createUpdateSchema(transfers);
export const transfersDeleteSchema = transfersSelectSchema.pick('id');

export type Transfer = typeof transfersSelectSchema.infer;
export type TransferInsert = typeof transfersInsertSchema.infer;
