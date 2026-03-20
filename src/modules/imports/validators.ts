import { type } from 'arktype';

import { importsDeleteSchema } from '@/modules/imports/models';

export const createImportSchema = type({
  accountId: 'string > 0',
  fileContent: '0 < string <= 5242880',
  fileHash: 'string > 0',
  fileName: '0 < string <= 255',
});

export type CreateImportInput = typeof createImportSchema.infer;

export const deleteImportSchema = importsDeleteSchema;
export type DeleteImportInput = typeof deleteImportSchema.infer;
