import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/imports')({
  component: ImportsLayout,
});

function ImportsLayout() {
  return <Outlet />;
}
