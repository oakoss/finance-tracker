import { createFileRoute } from '@tanstack/react-router';

import { AppHeader } from '@/components/layouts/app/app-header';
import { SidebarShell } from '@/components/layouts/shells/sidebar-shell';
import { ChartAreaInteractive } from '@/modules/demo/components/chart-area-interactive';
import { DataTable } from '@/modules/demo/components/data-table';
import { SectionCards } from '@/modules/demo/components/section-cards';
import { dashboardTableData } from '@/modules/demo/data/dashboard-table-data';
import { schema } from '@/modules/demo/data/data-table-schema';

export const Route = createFileRoute('/demo/dashboard')({
  component: DemoDashboard,
});

function DemoDashboard() {
  const tableData = schema.array().assert(dashboardTableData);

  return (
    <SidebarShell>
      <AppHeader>
        <h1 className="text-base font-medium">Dashboard</h1>
      </AppHeader>
      <main className="flex flex-1 flex-col gap-4 py-4">
        <SectionCards />
        <div className="px-4 lg:px-6">
          <ChartAreaInteractive />
        </div>
        <div className="px-4 lg:px-6">
          <DataTable data={tableData} />
        </div>
      </main>
    </SidebarShell>
  );
}
