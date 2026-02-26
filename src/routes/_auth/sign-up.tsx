import { createFileRoute } from '@tanstack/react-router';

import { SignUpForm } from '@/modules/auth/components/sign-up-form';

export const Route = createFileRoute('/_auth/sign-up')({
  component: SignUpPage,
});

function SignUpPage() {
  return <SignUpForm />;
}
