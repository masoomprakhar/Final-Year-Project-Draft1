"use client";

import { OptimizationView } from "@/components/analysis/OptimizationView";
import { PageFrame } from "@/components/pages/PageFrame";

export default function Page() {
  return (
    <PageFrame title="Optimization" intro="Find the cheapest operating point that meets the outlet limits." fill={false}>
      <OptimizationView />
    </PageFrame>
  );
}
