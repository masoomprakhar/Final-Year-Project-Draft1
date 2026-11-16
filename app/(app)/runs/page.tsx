"use client";

import { RunsPanel } from "@/components/bottom/RunsPanel";
import { PageFrame } from "@/components/pages/PageFrame";

export default function Page() {
  return (
    <PageFrame title="Runs" intro="Every stored simulation run with its ML demo columns and alerts.">
      <RunsPanel />
    </PageFrame>
  );
}
