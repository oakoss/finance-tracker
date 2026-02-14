import { Link } from '@tanstack/react-router';

import BetterAuthHeader from '@/integrations/better-auth/header-user';

export default function Header() {
  return (
    <header className="border-b border-white/10 bg-slate-950/70 backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-6">
          <Link className="text-lg font-semibold text-white" to="/">
            Finance Tracker
          </Link>
          <nav className="hidden items-center gap-4 text-sm text-slate-300 md:flex">
            <Link className="hover:text-white transition-colors" to="/">
              Dashboard
            </Link>
            <Link
              className="hover:text-white transition-colors"
              to="/demo/drizzle"
            >
              Drizzle Demo
            </Link>
            <Link
              className="hover:text-white transition-colors"
              to="/demo/better-auth"
            >
              Auth Demo
            </Link>
          </nav>
        </div>
        <BetterAuthHeader />
      </div>
    </header>
  );
}
