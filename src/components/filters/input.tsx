import { useEffect, useRef, useState } from 'react';

import type { FilterFieldConfig } from '@/components/filters/types';

import { validateInput } from '@/components/filters/helpers';
import { Icons } from '@/components/icons';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
} from '@/components/ui/input-group';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { m } from '@/paraglide/messages';

function FilterInput<T = unknown>({
  className,
  field,
  onBlur,
  onKeyDown,
  shouldFocus = false,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  className?: string | undefined;
  field?: FilterFieldConfig<T> | undefined;
  shouldFocus?: boolean | undefined;
}) {
  const [isValid, setIsValid] = useState(true);
  const [validationMessage, setValidationMessage] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const { autoFocus: _autoFocus, ...inputProps } = props;

  useEffect(() => {
    if (shouldFocus) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [shouldFocus]);

  function handleBlur(e: React.FocusEvent<HTMLInputElement>) {
    const value = e.target.value;
    const pattern = field?.pattern ?? props.pattern;

    if (value && (pattern || field?.validation)) {
      let valid = true;
      let customMessage = '';

      if (field?.validation) {
        const result = field.validation(value);
        if (typeof result === 'boolean') {
          valid = result;
        } else {
          valid = result.valid;
          customMessage = result.message ?? '';
        }
      } else if (pattern) {
        valid = validateInput(value, pattern);
      }

      setIsValid(valid);
      setValidationMessage(
        valid
          ? ''
          : customMessage.length > 0
            ? customMessage
            : m['filters.validation.invalid'](),
      );
    } else {
      setIsValid(true);
      setValidationMessage('');
    }

    onBlur?.(e);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (
      !isValid &&
      ![
        'Tab',
        'Escape',
        'Enter',
        'ArrowUp',
        'ArrowDown',
        'ArrowLeft',
        'ArrowRight',
      ].includes(e.key)
    ) {
      setIsValid(true);
      setValidationMessage('');
    }

    onKeyDown?.(e);
  }

  return (
    <InputGroup className={cn('w-36', className)}>
      {field?.prefix ? (
        <InputGroupAddon>
          <InputGroupText>{field.prefix}</InputGroupText>
        </InputGroupAddon>
      ) : null}
      <InputGroupInput
        ref={inputRef}
        aria-describedby={
          !isValid && validationMessage
            ? `${field?.key ?? 'input'}-error`
            : undefined
        }
        aria-invalid={!isValid}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        {...inputProps}
      />
      {!isValid && validationMessage && (
        <InputGroupAddon align="inline-end">
          <Tooltip>
            <TooltipTrigger render={<InputGroupButton size="icon-xs" />}>
              <Icons.CircleAlert className="text-destructive size-3.5" />
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-sm">{validationMessage}</p>
            </TooltipContent>
          </Tooltip>
        </InputGroupAddon>
      )}

      {field?.suffix ? (
        <InputGroupAddon align="inline-end">
          <InputGroupText>{field.suffix}</InputGroupText>
        </InputGroupAddon>
      ) : null}
    </InputGroup>
  );
}

export { FilterInput };
