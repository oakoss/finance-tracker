import { createFileRoute, notFound, Outlet } from '@tanstack/react-router';
import { ENV } from 'varlock/env';

export const Route = createFileRoute('/_demo')({
  beforeLoad: () => {
    if (ENV.APP_ENV === 'production') {
      throw notFound();
    }
  },
  component: DemoLayout,
});

function DemoLayout() {
  return <Outlet />;
}
