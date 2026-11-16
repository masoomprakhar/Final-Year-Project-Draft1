"use client";

import { DynamicsView } from "@/components/analysis/DynamicsView";
import { PageFrame } from "@/components/pages/PageFrame";

export default function Page() {
  return (
    <PageFrame title="Dynamic Simulation" intro="Step-test a feed variable and watch the outlets respond." fill={false}>
      <DynamicsView />
    </PageFrame>
  );
}
