"use client";

import { DashboardView } from "@/components/analysis/DashboardView";
import { PageFrame } from "@/components/pages/PageFrame";

export default function Page() {
  return (
    <PageFrame title="Dashboard" intro="Overview of the loaded plant data and the stored runs." fill={false}>
      <DashboardView />
    </PageFrame>
  );
}
