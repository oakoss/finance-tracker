import { createFileRoute } from '@tanstack/react-router';
import { type } from 'arktype';

import { SignInForm } from '@/modules/auth/components/sign-in-form';

const signInSearch = type({ 'redirect?': 'string' });

export const Route = createFileRoute('/_auth/sign-in')({
  component: SignInPage,
  validateSearch: (search) => signInSearch.assert(search),
});

function SignInPage() {
  const { redirect } = Route.useSearch();
  return <SignInForm redirect={redirect} />;
}
