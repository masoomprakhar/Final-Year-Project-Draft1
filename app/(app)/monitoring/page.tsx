"use client";

import { MonitoringPanel } from "@/components/pages/MonitoringPanel";
import { PageFrame } from "@/components/pages/PageFrame";

export default function Page() {
  return (
    <PageFrame title="Monitoring" intro="Run health and open alerts. Updates live while you are signed in.">
      <MonitoringPanel />
    </PageFrame>
  );
}
