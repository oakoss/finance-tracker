import { type } from 'arktype';

export const createPayeeSchema = type({ name: '0 < string <= 200' });

export type CreatePayeeInput = typeof createPayeeSchema.infer;
