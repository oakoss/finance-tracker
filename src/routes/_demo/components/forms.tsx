import { createFileRoute } from '@tanstack/react-router';

import { Checkbox } from '@/components/ui/checkbox';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  NumberField,
  NumberFieldDecrement,
  NumberFieldGroup,
  NumberFieldIncrement,
  NumberFieldInput,
} from '@/components/ui/number-field';
import { PasswordInput } from '@/components/ui/password-input';
import { PhoneInput } from '@/components/ui/phone-input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Section, Subsection } from '@/routes/_demo/components/shared';

export const Route = createFileRoute('/_demo/components/forms')({
  component: FormsPage,
});

function FormsPage() {
  return (
    <div className="space-y-10">
      <Section title="Field">
        <Subsection label="Vertical (default)">
          <FieldGroup className="max-w-sm">
            <Field>
              <FieldLabel>Email</FieldLabel>
              <Input placeholder="name@example.com" type="email" />
              <FieldDescription>
                We will never share your email.
              </FieldDescription>
            </Field>
          </FieldGroup>
        </Subsection>

        <Subsection label="Horizontal">
          <FieldGroup className="max-w-md">
            <Field orientation="horizontal">
              <FieldLabel>Username</FieldLabel>
              <Input placeholder="johndoe" />
            </Field>
          </FieldGroup>
        </Subsection>

        <Subsection label="With error">
          <FieldGroup className="max-w-sm">
            <Field data-invalid="true">
              <FieldLabel>Email</FieldLabel>
              <Input
                aria-invalid="true"
                placeholder="name@example.com"
                type="email"
              />
              <FieldError errors={['Please enter a valid email address.']} />
            </Field>
          </FieldGroup>
        </Subsection>

        <Subsection label="Disabled">
          <FieldGroup className="max-w-sm">
            <Field data-disabled="true">
              <FieldLabel>Email</FieldLabel>
              <Input disabled placeholder="name@example.com" type="email" />
            </Field>
          </FieldGroup>
        </Subsection>

        <Subsection label="FieldSet with legend">
          <FieldSet className="max-w-sm">
            <FieldLegend>Personal details</FieldLegend>
            <FieldDescription>Enter your name and email.</FieldDescription>
            <FieldGroup>
              <Field>
                <FieldLabel>Name</FieldLabel>
                <Input placeholder="John Doe" />
              </Field>
              <Field>
                <FieldLabel>Email</FieldLabel>
                <Input placeholder="name@example.com" type="email" />
              </Field>
            </FieldGroup>
          </FieldSet>
        </Subsection>

        <Subsection label="FieldSeparator">
          <FieldGroup className="max-w-sm">
            <Field>
              <FieldLabel>First name</FieldLabel>
              <Input placeholder="John" />
            </Field>
            <FieldSeparator>or</FieldSeparator>
            <Field>
              <FieldLabel>Last name</FieldLabel>
              <Input placeholder="Doe" />
            </Field>
          </FieldGroup>
        </Subsection>
      </Section>

      <Section title="Input">
        <Subsection label="Types">
          <div className="max-w-sm space-y-3">
            <Input placeholder="Text input" type="text" />
            <Input placeholder="name@example.com" type="email" />
            <Input placeholder="https://example.com" type="url" />
            <Input placeholder="Search..." type="search" />
            <Input type="file" />
          </div>
        </Subsection>

        <Subsection label="States">
          <div className="max-w-sm space-y-3">
            <Input placeholder="Default" />
            <Input disabled placeholder="Disabled" />
            <Input aria-invalid="true" placeholder="Invalid" />
          </div>
        </Subsection>
      </Section>

      <Section title="Textarea">
        <Subsection label="Default">
          <Textarea className="max-w-sm" placeholder="Type your message..." />
        </Subsection>

        <Subsection label="States">
          <div className="max-w-sm space-y-3">
            <Textarea placeholder="Default" />
            <Textarea disabled placeholder="Disabled" />
            <Textarea aria-invalid="true" placeholder="Invalid" />
          </div>
        </Subsection>
      </Section>

      <Section title="Checkbox">
        <Subsection label="Default">
          <Field orientation="horizontal">
            <Checkbox />
            <FieldContent>
              <FieldLabel>Accept terms and conditions</FieldLabel>
              <FieldDescription>
                You agree to our terms of service.
              </FieldDescription>
            </FieldContent>
          </Field>
        </Subsection>

        <Subsection label="States">
          <div className="space-y-3">
            <Field orientation="horizontal">
              <Checkbox />
              <FieldLabel>Unchecked</FieldLabel>
            </Field>
            <Field orientation="horizontal">
              <Checkbox checked />
              <FieldLabel>Checked</FieldLabel>
            </Field>
            <Field data-disabled="true" orientation="horizontal">
              <Checkbox disabled />
              <FieldLabel>Disabled</FieldLabel>
            </Field>
            <Field orientation="horizontal">
              <Checkbox aria-invalid="true" />
              <FieldLabel>Invalid</FieldLabel>
            </Field>
          </div>
        </Subsection>
      </Section>

      <Section title="Switch">
        <Subsection label="Sizes">
          <div className="space-y-3">
            <Field orientation="horizontal">
              <Switch size="sm" />
              <FieldLabel>Small</FieldLabel>
            </Field>
            <Field orientation="horizontal">
              <Switch />
              <FieldLabel>Default</FieldLabel>
            </Field>
          </div>
        </Subsection>

        <Subsection label="States">
          <div className="space-y-3">
            <Field orientation="horizontal">
              <Switch />
              <FieldLabel>Off</FieldLabel>
            </Field>
            <Field orientation="horizontal">
              <Switch defaultChecked />
              <FieldLabel>On</FieldLabel>
            </Field>
            <Field orientation="horizontal">
              <Switch disabled />
              <FieldLabel>Disabled</FieldLabel>
            </Field>
          </div>
        </Subsection>
      </Section>

      <Section title="Radio">
        <Subsection label="Default">
          <RadioGroup defaultValue="comfortable">
            <Field orientation="horizontal">
              <RadioGroupItem value="default" />
              <FieldLabel>Default</FieldLabel>
            </Field>
            <Field orientation="horizontal">
              <RadioGroupItem value="comfortable" />
              <FieldLabel>Comfortable</FieldLabel>
            </Field>
            <Field orientation="horizontal">
              <RadioGroupItem value="compact" />
              <FieldLabel>Compact</FieldLabel>
            </Field>
          </RadioGroup>
        </Subsection>

        <Subsection label="Disabled">
          <RadioGroup disabled defaultValue="option-1">
            <Field orientation="horizontal">
              <RadioGroupItem value="option-1" />
              <FieldLabel>Option 1</FieldLabel>
            </Field>
            <Field orientation="horizontal">
              <RadioGroupItem value="option-2" />
              <FieldLabel>Option 2</FieldLabel>
            </Field>
          </RadioGroup>
        </Subsection>
      </Section>

      <Section title="NumberField">
        <Subsection label="Sizes">
          <div className="max-w-xs space-y-3">
            <NumberField defaultValue={5} size="sm">
              <NumberFieldGroup>
                <NumberFieldDecrement />
                <NumberFieldInput />
                <NumberFieldIncrement />
              </NumberFieldGroup>
            </NumberField>
            <NumberField defaultValue={10}>
              <NumberFieldGroup>
                <NumberFieldDecrement />
                <NumberFieldInput />
                <NumberFieldIncrement />
              </NumberFieldGroup>
            </NumberField>
            <NumberField defaultValue={15} size="lg">
              <NumberFieldGroup>
                <NumberFieldDecrement />
                <NumberFieldInput />
                <NumberFieldIncrement />
              </NumberFieldGroup>
            </NumberField>
          </div>
        </Subsection>

        <Subsection label="With field label">
          <FieldGroup className="max-w-xs">
            <Field>
              <FieldLabel>Quantity</FieldLabel>
              <NumberField defaultValue={1} max={99} min={0}>
                <NumberFieldGroup>
                  <NumberFieldDecrement />
                  <NumberFieldInput />
                  <NumberFieldIncrement />
                </NumberFieldGroup>
              </NumberField>
            </Field>
          </FieldGroup>
        </Subsection>

        <Subsection label="Disabled">
          <NumberField disabled defaultValue={0}>
            <NumberFieldGroup className="max-w-xs">
              <NumberFieldDecrement />
              <NumberFieldInput />
              <NumberFieldIncrement />
            </NumberFieldGroup>
          </NumberField>
        </Subsection>
      </Section>

      <Section title="PasswordInput">
        <Subsection label="Default">
          <div className="max-w-sm">
            <PasswordInput placeholder="Enter password" />
          </div>
        </Subsection>

        <Subsection label="With field">
          <FieldGroup className="max-w-sm">
            <Field>
              <FieldLabel>Password</FieldLabel>
              <PasswordInput placeholder="Enter password" />
              <FieldDescription>
                Must be at least 8 characters.
              </FieldDescription>
            </Field>
          </FieldGroup>
        </Subsection>

        <Subsection label="Disabled">
          <div className="max-w-sm">
            <PasswordInput disabled placeholder="Enter password" />
          </div>
        </Subsection>
      </Section>

      <Section title="PhoneInput">
        <Subsection label="Default">
          <div className="max-w-sm">
            <PhoneInput defaultCountry="US" placeholder="Enter phone number" />
          </div>
        </Subsection>

        <Subsection label="With field">
          <FieldGroup className="max-w-sm">
            <Field>
              <FieldLabel>Phone number</FieldLabel>
              <PhoneInput
                defaultCountry="US"
                placeholder="Enter phone number"
              />
            </Field>
          </FieldGroup>
        </Subsection>
      </Section>
    </div>
  );
}
