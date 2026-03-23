import { useCallback, useMemo } from 'react';

import { Field, FieldLabel } from '@/components/ui/field';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  type ColumnMapping,
  REQUIRED_SINGLE_FIELDS,
  REQUIRED_SPLIT_FIELDS,
  TARGET_FIELD_OPTIONS,
  type TargetField,
} from '@/modules/imports/validators';
import { m } from '@/paraglide/messages';

type ColumnMapperProps = {
  headers: string[];
  onChange: (mapping: ColumnMapping) => void;
  value: ColumnMapping;
};

const FIELD_LABELS: Record<TargetField, () => string> = {
  amount: () => m['imports.upload.field.amount'](),
  categoryName: () => m['imports.upload.field.categoryName'](),
  creditAmount: () => m['imports.upload.field.creditAmount'](),
  debitAmount: () => m['imports.upload.field.debitAmount'](),
  description: () => m['imports.upload.field.description'](),
  memo: () => m['imports.upload.field.memo'](),
  payeeName: () => m['imports.upload.field.payeeName'](),
  skip: () => m['imports.upload.field.skip'](),
  transactionAt: () => m['imports.upload.field.transactionAt'](),
};

export function getFieldLabel(field: TargetField): string {
  return FIELD_LABELS[field]();
}

function getAvailableFields(amountMode: 'single' | 'split'): TargetField[] {
  if (amountMode === 'single') {
    return TARGET_FIELD_OPTIONS.filter(
      (f) => f !== 'debitAmount' && f !== 'creditAmount',
    );
  }
  return TARGET_FIELD_OPTIONS.filter((f) => f !== 'amount');
}

export function validateMapping(mapping: ColumnMapping): string[] {
  const errors: string[] = [];
  const requiredFields =
    mapping.amountMode === 'single'
      ? REQUIRED_SINGLE_FIELDS
      : REQUIRED_SPLIT_FIELDS;

  const assignedFields = new Set<TargetField>(
    Object.values(mapping.mapping).filter((f) => f !== 'skip'),
  );

  for (const field of requiredFields) {
    if (!assignedFields.has(field)) {
      errors.push(
        m['imports.upload.validation.requiredField']({
          field: getFieldLabel(field),
        }),
      );
    }
  }

  const counts = new Map<TargetField, number>();
  for (const field of Object.values(mapping.mapping)) {
    if (field !== 'skip') {
      counts.set(field, (counts.get(field) ?? 0) + 1);
    }
  }
  for (const [field, count] of counts) {
    if (count > 1) {
      errors.push(
        m['imports.upload.validation.duplicateField']({
          field: getFieldLabel(field),
        }),
      );
    }
  }

  return errors;
}

export function ColumnMapper({ headers, onChange, value }: ColumnMapperProps) {
  const availableFields = useMemo(
    () => getAvailableFields(value.amountMode),
    [value.amountMode],
  );

  const fieldItems = useMemo(
    () => Object.fromEntries(availableFields.map((f) => [f, getFieldLabel(f)])),
    [availableFields],
  );

  const handleAmountModeChange = useCallback(
    (mode: 'single' | 'split') => {
      const newMapping = { ...value.mapping };
      for (const [header, field] of Object.entries(newMapping)) {
        if (
          (mode === 'single' &&
            (field === 'debitAmount' || field === 'creditAmount')) ||
          (mode === 'split' && field === 'amount')
        ) {
          newMapping[header] = 'skip';
        }
      }
      onChange({ amountMode: mode, mapping: newMapping });
    },
    [value.mapping, onChange],
  );

  const handleFieldChange = useCallback(
    (header: string, field: TargetField) => {
      onChange({ ...value, mapping: { ...value.mapping, [header]: field } });
    },
    [value, onChange],
  );

  return (
    <div className="flex flex-col gap-4">
      <Field>
        <FieldLabel>{m['imports.upload.amountMode.label']()}</FieldLabel>
        <RadioGroup
          className="flex flex-row gap-4"
          value={value.amountMode}
          onValueChange={(v) => handleAmountModeChange(v as 'single' | 'split')}
        >
          <label className="flex items-center gap-2 text-sm">
            <RadioGroupItem value="single" />
            {m['imports.upload.amountMode.single']()}
          </label>
          <label className="flex items-center gap-2 text-sm">
            <RadioGroupItem value="split" />
            {m['imports.upload.amountMode.split']()}
          </label>
        </RadioGroup>
      </Field>

      <div className="flex flex-col gap-2">
        {headers.map((header) => (
          <div key={header} className="flex items-center gap-3">
            <span className="w-1/3 min-w-0 truncate text-sm font-medium">
              {header}
            </span>
            <div className="flex-1">
              <Select
                items={fieldItems}
                value={value.mapping[header] ?? 'skip'}
                onValueChange={(v) => {
                  if (v) handleFieldChange(header, v);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableFields.map((field) => (
                    <SelectItem key={field} value={field}>
                      {getFieldLabel(field)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
