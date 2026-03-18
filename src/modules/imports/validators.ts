import { type } from 'arktype';

export const createImportSchema = type({
  accountId: 'string > 0',
  fileContent: '0 < string <= 5242880',
  fileHash: 'string > 0',
  fileName: '0 < string <= 255',
});

export type CreateImportInput = typeof createImportSchema.infer;
