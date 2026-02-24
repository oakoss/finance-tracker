import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/dashboard')({
  component: DashboardPage,
});

function DashboardPage() {
  const { session } = Route.useRouteContext();

  return (
    <div className="px-4 py-6 lg:px-6">
      <h1 className="text-2xl font-semibold">
        Welcome, {session.user.name ?? 'User'}
      </h1>
    </div>
  );
}
