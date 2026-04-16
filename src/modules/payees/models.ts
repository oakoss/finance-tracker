import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from 'drizzle-arktype';

import { payees } from '@/modules/payees/db/schema';

export const payeesSelectSchema = createSelectSchema(payees);
export const payeesInsertSchema = createInsertSchema(payees);
export const payeesUpdateSchema = createUpdateSchema(payees);
export const payeesDeleteSchema = payeesSelectSchema.pick('id');

export type Payee = typeof payeesSelectSchema.infer;
export type PayeeInsert = typeof payeesInsertSchema.infer;
