import { useCallback, useMemo } from 'react';

import { Button } from '@/components/ui/button';
import { Field, FieldContent, FieldLabel } from '@/components/ui/field';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { autoDetectMapping } from '@/modules/imports/lib/auto-detect-mapping';
import {
  type ColumnMapping,
  REQUIRED_SINGLE_FIELDS,
  REQUIRED_SPLIT_FIELDS,
  TARGET_FIELD_OPTIONS,
  type TargetField,
} from '@/modules/imports/validators';
import { m } from '@/paraglide/messages';

type ColumnMapperProps = {
  duplicateFields?: Set<TargetField> | undefined;
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

export type MappingValidation = {
  duplicateFields: Set<TargetField>;
  errors: string[];
  missingFields: Set<TargetField>;
};

export function validateMapping(mapping: ColumnMapping): MappingValidation {
  const errors: string[] = [];
  const missingFields = new Set<TargetField>();
  const duplicateFields = new Set<TargetField>();

  const requiredFields =
    mapping.amountMode === 'single'
      ? REQUIRED_SINGLE_FIELDS
      : REQUIRED_SPLIT_FIELDS;

  const assignedFields = new Set<TargetField>(
    Object.values(mapping.mapping).filter((f) => f !== 'skip'),
  );

  for (const field of requiredFields) {
    if (!assignedFields.has(field)) {
      missingFields.add(field);
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
      duplicateFields.add(field);
      errors.push(
        m['imports.upload.validation.duplicateField']({
          field: getFieldLabel(field),
        }),
      );
    }
  }

  return { duplicateFields, errors, missingFields };
}

export function ColumnMapper({
  duplicateFields,
  headers,
  onChange,
  value,
}: ColumnMapperProps) {
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

  const handleReset = useCallback(() => {
    onChange(autoDetectMapping(headers, value.amountMode));
  }, [headers, value.amountMode, onChange]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end justify-between gap-4">
        <Field className="flex-1">
          <FieldLabel>{m['imports.upload.amountMode.label']()}</FieldLabel>
          <RadioGroup
            className="flex flex-row gap-4"
            value={value.amountMode}
            onValueChange={(v) =>
              handleAmountModeChange(v as 'single' | 'split')
            }
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
        <Button size="sm" variant="outline" onClick={handleReset}>
          {m['imports.upload.resetMapping']()}
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        {headers.map((header) => {
          const mapped = value.mapping[header] ?? 'skip';
          const isDuplicate =
            mapped !== 'skip' && !!duplicateFields?.has(mapped);
          return (
            <Field
              key={header}
              className="grid grid-cols-[1fr_2fr] items-center gap-3"
              data-invalid={isDuplicate}
            >
              <FieldLabel className="min-w-0 truncate" htmlFor={header}>
                {header}
              </FieldLabel>
              <FieldContent>
                <Select
                  items={fieldItems}
                  value={mapped}
                  onValueChange={(v) => {
                    if (v) handleFieldChange(header, v);
                  }}
                >
                  <SelectTrigger
                    aria-invalid={isDuplicate}
                    className="w-full"
                    id={header}
                  >
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
              </FieldContent>
            </Field>
          );
        })}
      </div>
    </div>
  );
}
