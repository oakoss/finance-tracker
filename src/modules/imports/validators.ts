import { type } from 'arktype';

import {
  TARGET_FIELD_VALUES,
  type TargetField,
} from '@/modules/imports/constants';
import { importsDeleteSchema } from '@/modules/imports/models';

export type { TargetField } from '@/modules/imports/constants';

export const TARGET_FIELD_OPTIONS: readonly TargetField[] = TARGET_FIELD_VALUES;

export const REQUIRED_SINGLE_FIELDS: readonly TargetField[] = [
  'description',
  'amount',
  'transactionAt',
];

export const REQUIRED_SPLIT_FIELDS: readonly TargetField[] = [
  'description',
  'debitAmount',
  'creditAmount',
  'transactionAt',
];

export const columnMappingSchema = type({
  amountMode: "'single' | 'split'",
  mapping:
    "Record<string, 'amount' | 'categoryName' | 'creditAmount' | 'debitAmount' | 'description' | 'memo' | 'payeeName' | 'skip' | 'transactionAt'>",
});

export type ColumnMapping = typeof columnMappingSchema.infer;

export const createImportSchema = type({
  accountId: 'string > 0',
  'columnMapping?': columnMappingSchema,
  fileContent: '0 < string <= 5242880',
  fileHash: 'string > 0',
  fileName: '0 < string <= 255',
});

export type CreateImportInput = typeof createImportSchema.infer;

export const commitImportSchema = type({ importId: 'string > 0' });
export type CommitImportInput = typeof commitImportSchema.infer;

export const deleteImportSchema = importsDeleteSchema;
export type DeleteImportInput = typeof deleteImportSchema.infer;

export const listImportRowsSchema = type({ importId: 'string > 0' });
export type ListImportRowsInput = typeof listImportRowsSchema.infer;

export const updateImportRowStatusSchema = type({
  id: 'string > 0',
  status: "'mapped' | 'ignored'",
});
export type UpdateImportRowStatusInput =
  typeof updateImportRowStatusSchema.infer;

export const updateImportRowDataSchema = type({
  id: 'string > 0',
  normalizedData: type({
    'amountCents?': 'number',
    'categoryName?': 'string',
    'description?': 'string',
    'memo?': 'string',
    'payeeName?': 'string',
    'transactionAt?': 'string',
  }),
});
export type UpdateImportRowDataInput = typeof updateImportRowDataSchema.infer;
