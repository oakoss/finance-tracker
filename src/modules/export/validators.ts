import { type } from 'arktype';

export const exportUserDataSchema = type({ format: "'csv' | 'json'" });

export type ExportUserDataInput = typeof exportUserDataSchema.infer;
