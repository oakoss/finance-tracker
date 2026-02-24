import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { type } from 'arktype';
import { useState } from 'react';

import { RouterLink } from '@/components/ui/link';
import { authClient } from '@/lib/auth-client';
import { clientLog } from '@/lib/logging/client-logger';

const loginSearch = type({ 'redirect?': 'string' });

export const Route = createFileRoute('/_auth/login')({
  component: LoginPage,
  validateSearch: (search) => loginSearch.assert(search),
});

function LoginPage() {
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await authClient.signIn.email({
        email,
        password,
      });

      if (result.error) {
        setError(result.error.message ?? 'Sign in failed');
      } else {
        const to =
          redirect && redirect.startsWith('/') && !redirect.startsWith('//')
            ? redirect
            : '/';
        void navigate({ to });
      }
    } catch (error) {
      clientLog.error({
        action: 'auth.login',
        error: error instanceof Error ? error.message : String(error),
        outcome: { success: false },
      });
      setError(
        'An unexpected error occurred. Please check your connection and try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-lg font-semibold leading-none tracking-tight">
        Sign in
      </h1>
      <p className="text-sm text-muted-foreground mt-2 mb-6">
        Enter your email below to login to your account
      </p>

      <form className="grid gap-4" onSubmit={handleSubmit}>
        <div className="grid gap-2">
          <label className="text-sm font-medium leading-none" htmlFor="email">
            Email
          </label>
          <input
            required
            className="flex h-9 w-full border border-input bg-transparent px-3 text-sm focus:outline-none focus:border-foreground disabled:cursor-not-allowed disabled:opacity-50"
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>

        <div className="grid gap-2">
          <label
            className="text-sm font-medium leading-none"
            htmlFor="password"
          >
            Password
          </label>
          <input
            required
            className="flex h-9 w-full border border-input bg-transparent px-3 text-sm focus:outline-none focus:border-foreground disabled:cursor-not-allowed disabled:opacity-50"
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 p-3">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <button
          className="w-full h-9 px-4 text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={loading}
          type="submit"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="size-4 animate-spin rounded-full border-2 border-primary-foreground/40 border-t-primary-foreground" />
              <span>Please wait</span>
            </span>
          ) : (
            'Sign in'
          )}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{' '}
        <RouterLink to="/signup">Sign up</RouterLink>
      </p>
    </div>
  );
}
