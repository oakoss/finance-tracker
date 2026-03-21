import { createFileRoute, notFound, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/_demo')({
  beforeLoad: () => {
    if (!import.meta.env.VITE_DEMO_PAGES) {
      throw notFound();
    }
  },
  component: DemoLayout,
});

function DemoLayout() {
  return <Outlet />;
}
