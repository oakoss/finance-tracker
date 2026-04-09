import { createFileRoute } from '@tanstack/react-router';
import * as React from 'react';

import { Icons } from '@/components/icons';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { DatePicker } from '@/components/ui/date-picker';
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
import { FileUpload } from '@/components/ui/file-upload';
import { Input } from '@/components/ui/input';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
  InputGroupTextarea,
} from '@/components/ui/input-group';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from '@/components/ui/input-otp';
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
import { Rating } from '@/components/ui/rating';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useFileUpload } from '@/hooks/use-file-upload';
import { Section, Subsection } from '@/routes/_demo/components/-shared';

export const Route = createFileRoute('/_demo/components/forms')({
  component: FormsPage,
});

// oxlint-disable-next-line no-empty-function -- intentional no-op
const noop = () => {};

function FormsPage() {
  const [ratingValue, setRatingValue] = React.useState(3);
  const [dateValue, setDateValue] = React.useState('');
  const [defaultUploadState, defaultUploadActions] = useFileUpload({
    maxSize: 5 * 1024 * 1024,
  });
  const [csvUploadState, csvUploadActions] = useFileUpload({
    accept: '.csv',
    maxSize: 5 * 1024 * 1024,
  });

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

        <Subsection className="block" label="States">
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
            <Field data-disabled="true" orientation="horizontal">
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
              <RadioGroupItem id="radio-default" value="default" />
              <FieldLabel htmlFor="radio-default">Default</FieldLabel>
            </Field>
            <Field orientation="horizontal">
              <RadioGroupItem id="radio-comfortable" value="comfortable" />
              <FieldLabel htmlFor="radio-comfortable">Comfortable</FieldLabel>
            </Field>
            <Field orientation="horizontal">
              <RadioGroupItem id="radio-compact" value="compact" />
              <FieldLabel htmlFor="radio-compact">Compact</FieldLabel>
            </Field>
          </RadioGroup>
        </Subsection>

        <Subsection label="Disabled">
          <RadioGroup disabled defaultValue="option-1">
            <Field data-disabled="true" orientation="horizontal">
              <RadioGroupItem id="radio-disabled-1" value="option-1" />
              <FieldLabel htmlFor="radio-disabled-1">Option 1</FieldLabel>
            </Field>
            <Field data-disabled="true" orientation="horizontal">
              <RadioGroupItem id="radio-disabled-2" value="option-2" />
              <FieldLabel htmlFor="radio-disabled-2">Option 2</FieldLabel>
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

      <Section title="InputGroup">
        <Subsection label="With icon addon">
          <div className="max-w-sm">
            <InputGroup>
              <InputGroupAddon>
                <InputGroupText>
                  <Icons.Search />
                </InputGroupText>
              </InputGroupAddon>
              <InputGroupInput placeholder="Search..." />
            </InputGroup>
          </div>
        </Subsection>

        <Subsection label="With button addon">
          <div className="max-w-sm">
            <InputGroup>
              <InputGroupInput placeholder="Enter URL..." />
              <InputGroupAddon align="inline-end">
                <InputGroupButton variant="outline">Copy</InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
          </div>
        </Subsection>

        <Subsection label="With text addon">
          <div className="max-w-sm">
            <InputGroup>
              <InputGroupAddon>
                <InputGroupText>$</InputGroupText>
              </InputGroupAddon>
              <InputGroupInput placeholder="0.00" type="number" />
              <InputGroupAddon align="inline-end">
                <InputGroupText>USD</InputGroupText>
              </InputGroupAddon>
            </InputGroup>
          </div>
        </Subsection>

        <Subsection className="block" label="With textarea">
          <div className="max-w-sm">
            <InputGroup>
              <InputGroupTextarea placeholder="Write a note..." rows={3} />
              <InputGroupAddon align="block-end">
                <InputGroupButton variant="outline">Send</InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
          </div>
        </Subsection>
      </Section>

      <Section title="InputOTP">
        <Subsection label="6 digits">
          <InputOTP maxLength={6}>
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
            </InputOTPGroup>
            <InputOTPSeparator />
            <InputOTPGroup>
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>
        </Subsection>

        <Subsection label="4 digits">
          <InputOTP maxLength={4}>
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
            </InputOTPGroup>
          </InputOTP>
        </Subsection>
      </Section>

      <Section title="Slider">
        <Subsection className="block max-w-sm" label="Default">
          <Slider defaultValue={[50]} />
        </Subsection>

        <Subsection className="block max-w-sm" label="Range">
          <Slider defaultValue={[25, 75]} />
        </Subsection>

        <Subsection className="block max-w-sm" label="Disabled">
          <Slider disabled defaultValue={[40]} />
        </Subsection>
      </Section>

      <Section title="Rating">
        <Subsection label="Read-only">
          <Rating rating={3.5} />
        </Subsection>

        <Subsection label="With value">
          <Rating showValue rating={4.2} />
        </Subsection>

        <Subsection label="Editable">
          <Rating
            editable
            showValue
            rating={ratingValue}
            onRatingChange={setRatingValue}
          />
        </Subsection>

        <Subsection label="Sizes">
          <Rating rating={4} size="sm" />
          <Rating rating={4} />
          <Rating rating={4} size="lg" />
        </Subsection>
      </Section>

      <Section title="DatePicker">
        <Subsection label="Default">
          <div className="max-w-sm">
            <DatePicker
              placeholder="Pick a date"
              value={dateValue}
              onValueChange={setDateValue}
            />
          </div>
        </Subsection>

        <Subsection label="Disabled">
          <div className="max-w-sm">
            <DatePicker
              disabled
              placeholder="Pick a date"
              value=""
              onValueChange={noop}
            />
          </div>
        </Subsection>
      </Section>

      <Section title="FileUpload">
        <Subsection className="block max-w-md" label="Default (any file)">
          <FileUpload
            actions={defaultUploadActions}
            emptyHint="Up to 5 MB"
            emptyLabel="Drop a file or click to browse"
            state={defaultUploadState}
          />
        </Subsection>

        <Subsection className="block max-w-md" label="Accept filter (CSV only)">
          <FileUpload
            actions={csvUploadActions}
            emptyHint=".csv up to 5 MB"
            emptyLabel="Drop a CSV file or click to browse"
            state={csvUploadState}
          />
        </Subsection>
      </Section>

      <Section title="Calendar">
        <Subsection className="block" label="Single select">
          <Calendar mode="single" />
        </Subsection>

        <Subsection className="block" label="Range select">
          <Calendar mode="range" />
        </Subsection>
      </Section>
    </div>
  );
}
