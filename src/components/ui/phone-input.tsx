import type React from 'react';

import { createContext, use, useMemo, useState } from 'react';
import * as BasePhoneInput from 'react-phone-number-input';
import flags from 'react-phone-number-input/flags';

import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxSeparator,
  ComboboxTrigger,
  ComboboxValue,
} from '@/components/ui/combobox';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

type PhoneInputSize = 'sm' | 'default' | 'lg';

const PhoneInputContext = createContext<{
  popupClassName?: string | undefined;
  scrollAreaClassName?: string | undefined;
  variant: PhoneInputSize;
}>({
  popupClassName: undefined,
  scrollAreaClassName: undefined,
  variant: 'default',
});

type PhoneInputProps = Omit<
  React.ComponentProps<'input'>,
  'onChange' | 'value' | 'ref'
> &
  Omit<
    BasePhoneInput.Props<typeof BasePhoneInput.default>,
    'onChange' | 'variant' | 'popupClassName' | 'scrollAreaClassName'
  > & {
    onChange?: (value: BasePhoneInput.Value) => void;
    popupClassName?: string;
    scrollAreaClassName?: string;
    variant?: PhoneInputSize;
  };

function PhoneInput({
  className,
  onChange,
  popupClassName,
  scrollAreaClassName,
  value,
  variant,
  ...props
}: PhoneInputProps) {
  const phoneInputSize = variant ?? 'default';
  return (
    <PhoneInputContext
      value={{ popupClassName, scrollAreaClassName, variant: phoneInputSize }}
    >
      {/* @ts-expect-error -- react-phone-number-input Props lack `| undefined` on optional fields, incompatible with exactOptionalPropertyTypes */}
      <BasePhoneInput.default
        {...props}
        className={cn(
          'flex',
          props['aria-invalid'] &&
            '[&_*[data-slot=combobox-trigger]]:border-destructive [&_*[data-slot=combobox-trigger]]:ring-destructive/50',
          className,
        )}
        countrySelectComponent={CountrySelect}
        flagComponent={FlagComponent}
        inputComponent={InputComponent}
        smartCaret={false}
        value={value ?? undefined}
        onChange={(nextValue) =>
          onChange?.(nextValue ?? ('' as BasePhoneInput.Value))
        }
      />
    </PhoneInputContext>
  );
}

function InputComponent({
  className,
  ...props
}: React.ComponentProps<typeof Input>) {
  const { variant } = use(PhoneInputContext);

  return (
    <Input
      className={cn(
        'ring-none! rounded-s-none outline-none! focus:z-1',
        variant === 'sm' && 'h-8',
        variant === 'lg' && 'h-10',
        className,
      )}
      {...props}
    />
  );
}

type CountryEntry = {
  label: string;
  value: BasePhoneInput.Country | undefined;
};

type CountrySelectProps = {
  disabled?: boolean;
  onChange: (country: BasePhoneInput.Country) => void;
  options: CountryEntry[];
  value?: BasePhoneInput.Country;
};

function CountrySelect({
  disabled,
  onChange,
  options: countryList,
  value: selectedCountry,
}: CountrySelectProps) {
  const { popupClassName, variant } = use(PhoneInputContext);
  const [searchValue, setSearchValue] = useState('');

  const filteredCountries = useMemo(() => {
    if (!searchValue) return countryList;
    return countryList.filter(({ label }) =>
      label.toLowerCase().includes(searchValue.toLowerCase()),
    );
  }, [countryList, searchValue]);

  return (
    <Combobox
      items={filteredCountries}
      value={selectedCountry ?? ''}
      onValueChange={(country) => {
        if (country) {
          onChange(country as BasePhoneInput.Country);
        }
      }}
    >
      <ComboboxTrigger
        render={
          <Button
            className={cn(
              'flex gap-1 rounded-s-lg rounded-e-none border-e-0 px-2.5 py-0 leading-none hover:bg-transparent focus:z-10 data-pressed:bg-transparent',
              disabled && 'opacity-50',
            )}
            disabled={disabled}
            size={variant}
            variant="outline"
          >
            <span className="sr-only">
              <ComboboxValue />
            </span>
            <FlagPreview
              country={selectedCountry}
              countryName={selectedCountry}
            />
          </Button>
        }
      />
      <ComboboxContent
        className={cn(
          'w-xs *:data-[slot=input-group]:bg-transparent',
          popupClassName,
        )}
      >
        <ComboboxInput
          className="rounded-none border-0 border-input px-0 py-2.5 shadow-none ring-0! outline-none! focus-visible:border-border focus-visible:ring-0 focus-visible:ring-offset-0"
          placeholder="e.g. United States"
          showTrigger={false}
          value={searchValue}
          onChange={(event) => setSearchValue(event.target.value)}
        />
        <ComboboxSeparator />
        <ComboboxEmpty className="px-4 py-2.5 text-sm">
          No country found.
        </ComboboxEmpty>
        <ComboboxList>
          <div className="relative flex max-h-full">
            <div className="flex max-h-[min(var(--available-height),24rem)] w-full scroll-py-2 flex-col overscroll-contain">
              <ScrollArea className="size-full min-h-0 **:data-[slot=scroll-area-scrollbar]:m-0 **:data-[slot=scroll-area-viewport]:h-full **:data-[slot=scroll-area-viewport]:overscroll-contain">
                {filteredCountries.map((item: CountryEntry) =>
                  item.value ? (
                    <ComboboxItem
                      key={item.value}
                      className="flex items-center gap-2"
                      value={item.value}
                    >
                      <FlagPreview
                        country={item.value}
                        countryName={item.label}
                      />
                      <span className="flex-1 text-sm">{item.label}</span>
                      <span className="text-sm text-foreground/50">
                        {`+${BasePhoneInput.getCountryCallingCode(item.value)}`}
                      </span>
                    </ComboboxItem>
                  ) : null,
                )}
              </ScrollArea>
            </div>
          </div>
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

type FlagPreviewProps = {
  country?: BasePhoneInput.Country | undefined;
  countryName?: string | undefined;
};

function FlagPreview({ country, countryName }: FlagPreviewProps) {
  const Flag = country ? flags[country] : undefined;
  const label = countryName ?? country ?? 'Unknown country';

  return country && Flag ? (
    <span className="flex size-5 shrink-0 items-center justify-center">
      <span className="sr-only">{label}</span>
      <Flag title={label} />
    </span>
  ) : (
    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted">
      <Icons.Globe className="size-4 text-muted-icon" />
    </span>
  );
}

function FlagComponent({ country, countryName }: BasePhoneInput.FlagProps) {
  return <FlagPreview country={country} countryName={countryName} />;
}

export { PhoneInput };
