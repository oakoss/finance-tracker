import { createFileRoute, notFound, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/_demo')({
  beforeLoad: () => {
    if (process.env.NODE_ENV === 'production') {
      throw notFound();
    }
  },
  component: DemoLayout,
});

function DemoLayout() {
  return <Outlet />;
}
