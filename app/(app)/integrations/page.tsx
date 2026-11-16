"use client";

import { IntegrationsView } from "@/components/analysis/IntegrationsView";
import { PageFrame } from "@/components/pages/PageFrame";

export default function Page() {
  return (
    <PageFrame title="Integrations" intro="Which services are connected, and which are still placeholders." fill={false}>
      <IntegrationsView />
    </PageFrame>
  );
}
