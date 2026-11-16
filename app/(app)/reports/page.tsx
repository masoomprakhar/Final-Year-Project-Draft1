"use client";

import { ReportsView } from "@/components/analysis/ReportsView";
import { PageFrame } from "@/components/pages/PageFrame";

export default function Page() {
  return (
    <PageFrame title="Reports" intro="Export the current case and run summary." fill={false}>
      <ReportsView />
    </PageFrame>
  );
}
