import { createFileRoute } from '@tanstack/react-router';

import {
  Autocomplete,
  AutocompleteContent,
  AutocompleteInput,
  AutocompleteItem,
  AutocompleteList,
} from '@/components/ui/autocomplete';
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@/components/ui/combobox';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import {
  NativeSelect,
  NativeSelectOptGroup,
  NativeSelectOption,
} from '@/components/ui/native-select';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Section, Subsection } from '@/routes/_demo/components/-shared';

export const Route = createFileRoute('/_demo/components/selections')({
  component: SelectionsPage,
});

const FRUITS = [
  { label: 'Apple', value: 'apple' },
  { label: 'Banana', value: 'banana' },
  { label: 'Cherry', value: 'cherry' },
  { label: 'Grape', value: 'grape' },
  { label: 'Orange', value: 'orange' },
  { label: 'Strawberry', value: 'strawberry' },
];

const FRAMEWORKS = [
  { label: 'Next.js', value: 'nextjs' },
  { label: 'Remix', value: 'remix' },
  { label: 'SvelteKit', value: 'sveltekit' },
  { label: 'TanStack Start', value: 'tanstack-start' },
];

function SelectionsPage() {
  return (
    <div className="space-y-10">
      <Section title="Select">
        <Subsection label="Default">
          <Select defaultValue="banana">
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FRUITS.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Subsection>

        <Subsection label="Placeholder">
          <Select>
            <SelectTrigger>
              <SelectValue placeholder="Select a fruit..." />
            </SelectTrigger>
            <SelectContent>
              {FRUITS.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Subsection>

        <Subsection label="Size sm">
          <Select defaultValue="apple">
            <SelectTrigger size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FRUITS.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Subsection>

        <Subsection label="With groups">
          <Select>
            <SelectTrigger>
              <SelectValue placeholder="Pick a framework..." />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>React</SelectLabel>
                <SelectItem value="nextjs">Next.js</SelectItem>
                <SelectItem value="remix">Remix</SelectItem>
                <SelectItem value="tanstack-start">TanStack Start</SelectItem>
              </SelectGroup>
              <SelectSeparator />
              <SelectGroup>
                <SelectLabel>Other</SelectLabel>
                <SelectItem value="sveltekit">SvelteKit</SelectItem>
                <SelectItem value="nuxt">Nuxt</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </Subsection>

        <Subsection label="Disabled">
          <Select disabled defaultValue="apple">
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FRUITS.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Subsection>

        <Subsection label="With field">
          <FieldGroup className="max-w-sm">
            <Field>
              <FieldLabel>Favorite fruit</FieldLabel>
              <Select>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a fruit..." />
                </SelectTrigger>
                <SelectContent>
                  {FRUITS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </FieldGroup>
        </Subsection>
      </Section>

      <Section title="Combobox">
        <Subsection label="Default">
          <div className="max-w-sm">
            <Combobox items={FRAMEWORKS}>
              <ComboboxInput placeholder="Search frameworks..." />
              <ComboboxContent>
                <ComboboxEmpty>No framework found.</ComboboxEmpty>
                <ComboboxList>
                  {FRAMEWORKS.map((f) => (
                    <ComboboxItem key={f.value} value={f.value}>
                      {f.label}
                    </ComboboxItem>
                  ))}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
          </div>
        </Subsection>

        <Subsection label="With clear button">
          <div className="max-w-sm">
            <Combobox items={FRAMEWORKS}>
              <ComboboxInput showClear placeholder="Search frameworks..." />
              <ComboboxContent>
                <ComboboxEmpty>No framework found.</ComboboxEmpty>
                <ComboboxList>
                  {FRAMEWORKS.map((f) => (
                    <ComboboxItem key={f.value} value={f.value}>
                      {f.label}
                    </ComboboxItem>
                  ))}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
          </div>
        </Subsection>

        <Subsection label="With field">
          <FieldGroup className="max-w-sm">
            <Field>
              <FieldLabel>Framework</FieldLabel>
              <Combobox items={FRAMEWORKS}>
                <ComboboxInput placeholder="Search frameworks..." />
                <ComboboxContent>
                  <ComboboxEmpty>No framework found.</ComboboxEmpty>
                  <ComboboxList>
                    {FRAMEWORKS.map((f) => (
                      <ComboboxItem key={f.value} value={f.value}>
                        {f.label}
                      </ComboboxItem>
                    ))}
                  </ComboboxList>
                </ComboboxContent>
              </Combobox>
            </Field>
          </FieldGroup>
        </Subsection>
      </Section>

      <Section title="Autocomplete">
        <Subsection label="Default">
          <div className="max-w-sm">
            <Autocomplete>
              <AutocompleteInput showTrigger placeholder="Search fruits..." />
              <AutocompleteContent>
                <AutocompleteList>
                  {FRUITS.map((f) => (
                    <AutocompleteItem key={f.value} value={f.value}>
                      {f.label}
                    </AutocompleteItem>
                  ))}
                </AutocompleteList>
              </AutocompleteContent>
            </Autocomplete>
          </div>
        </Subsection>

        <Subsection label="With clear">
          <div className="max-w-sm">
            <Autocomplete>
              <AutocompleteInput
                showClear
                showTrigger
                placeholder="Search fruits..."
              />
              <AutocompleteContent>
                <AutocompleteList>
                  {FRUITS.map((f) => (
                    <AutocompleteItem key={f.value} value={f.value}>
                      {f.label}
                    </AutocompleteItem>
                  ))}
                </AutocompleteList>
              </AutocompleteContent>
            </Autocomplete>
          </div>
        </Subsection>

        <Subsection label="With field">
          <FieldGroup className="max-w-sm">
            <Field>
              <FieldLabel>Fruit</FieldLabel>
              <Autocomplete>
                <AutocompleteInput showTrigger placeholder="Search fruits..." />
                <AutocompleteContent>
                  <AutocompleteList>
                    {FRUITS.map((f) => (
                      <AutocompleteItem key={f.value} value={f.value}>
                        {f.label}
                      </AutocompleteItem>
                    ))}
                  </AutocompleteList>
                </AutocompleteContent>
              </Autocomplete>
            </Field>
          </FieldGroup>
        </Subsection>
      </Section>

      <Section title="NativeSelect">
        <Subsection label="Default">
          <NativeSelect>
            {FRUITS.map((f) => (
              <NativeSelectOption key={f.value} value={f.value}>
                {f.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Subsection>

        <Subsection label="Size sm">
          <NativeSelect size="sm">
            {FRUITS.map((f) => (
              <NativeSelectOption key={f.value} value={f.value}>
                {f.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Subsection>

        <Subsection label="With groups">
          <NativeSelect>
            <NativeSelectOptGroup label="Citrus">
              <NativeSelectOption value="orange">Orange</NativeSelectOption>
              <NativeSelectOption value="lemon">Lemon</NativeSelectOption>
            </NativeSelectOptGroup>
            <NativeSelectOptGroup label="Berries">
              <NativeSelectOption value="strawberry">
                Strawberry
              </NativeSelectOption>
              <NativeSelectOption value="blueberry">
                Blueberry
              </NativeSelectOption>
            </NativeSelectOptGroup>
          </NativeSelect>
        </Subsection>

        <Subsection label="Disabled">
          <NativeSelect disabled>
            {FRUITS.map((f) => (
              <NativeSelectOption key={f.value} value={f.value}>
                {f.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Subsection>

        <Subsection label="With field">
          <FieldGroup className="max-w-sm">
            <Field>
              <FieldLabel>Fruit</FieldLabel>
              <NativeSelect className="w-full">
                <NativeSelectOption value="">
                  Select a fruit...
                </NativeSelectOption>
                {FRUITS.map((f) => (
                  <NativeSelectOption key={f.value} value={f.value}>
                    {f.label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
          </FieldGroup>
        </Subsection>
      </Section>
    </div>
  );
}
