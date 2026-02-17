import { createFileRoute } from '@tanstack/react-router';
import type { CSSProperties } from 'react';

import { AppSidebar } from '@/components/layouts/app-sidebar';
import { SiteHeader } from '@/components/site/site-header';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { ChartAreaInteractive } from '@/modules/demo/components/chart-area-interactive';
import { DataTable } from '@/modules/demo/components/data-table';
import { SectionCards } from '@/modules/demo/components/section-cards';
import { dashboardTableData } from '@/modules/demo/data/dashboard-table-data';
import { schema } from '@/modules/demo/data/data-table-schema';

export const Route = createFileRoute('/demo/dashboard')({
  component: DemoDashboard,
});

const headerStyles = {
  '--header-height': '3.5rem',
} as CSSProperties;

function DemoDashboard() {
  const tableData = schema.array().assert(dashboardTableData);

  return (
    <SidebarProvider style={headerStyles}>
      <AppSidebar />
      <SidebarInset>
        <SiteHeader />
        <main className="flex flex-1 flex-col gap-4 py-4">
          <SectionCards />
          <div className="px-4 lg:px-6">
            <ChartAreaInteractive />
          </div>
          <div className="px-4 lg:px-6">
            <DataTable data={tableData} />
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
