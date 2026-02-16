import { createFileRoute } from '@tanstack/react-router';
import type { CSSProperties } from 'react';

import { ChartAreaInteractive } from '@/components/chart-area-interactive';
import { DataTable, schema } from '@/components/data-table';
import { AppSidebar } from '@/components/layouts/app-sidebar';
import { SectionCards } from '@/components/section-cards';
import { SiteHeader } from '@/components/site/site-header';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { dashboardTableData } from '@/data/dashboard-table-data';

export const Route = createFileRoute('/demo/dashboard')({
  component: DemoDashboard,
});

const headerStyles = {
  '--header-height': '3.5rem',
} as CSSProperties;

function DemoDashboard() {
  const tableData = schema.array().parse(dashboardTableData);

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
