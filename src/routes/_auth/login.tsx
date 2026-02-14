import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';

import { authClient } from '@/lib/auth-client';

export const Route = createFileRoute('/_auth/login')({
  component: LoginPage,
});

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
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
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-lg font-semibold leading-none tracking-tight">
        Sign in
      </h1>
      <p className="text-sm text-neutral-500 mt-2 mb-6">
        Enter your email below to login to your account
      </p>

      <form className="grid gap-4" onSubmit={handleSubmit}>
        <div className="grid gap-2">
          <label className="text-sm font-medium leading-none" htmlFor="email">
            Email
          </label>
          <input
            required
            className="flex h-9 w-full border border-neutral-300 bg-transparent px-3 text-sm focus:outline-none focus:border-neutral-900 disabled:cursor-not-allowed disabled:opacity-50"
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
            className="flex h-9 w-full border border-neutral-300 bg-transparent px-3 text-sm focus:outline-none focus:border-neutral-900 disabled:cursor-not-allowed disabled:opacity-50"
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 p-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <button
          className="w-full h-9 px-4 text-sm font-medium text-white bg-neutral-900 hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={loading}
          type="submit"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="size-4  animate-spin rounded-full border-2 border-neutral-400 border-t-white" />
              <span>Please wait</span>
            </span>
          ) : (
            'Sign in'
          )}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-neutral-500">
        Don&apos;t have an account?{' '}
        <Link className="text-neutral-900 hover:underline" to="/signup">
          Sign up
        </Link>
      </p>
    </div>
  );
}
