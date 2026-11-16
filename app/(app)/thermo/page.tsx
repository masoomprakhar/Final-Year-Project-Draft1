"use client";

import { ThermoView } from "@/components/analysis/ThermoView";
import { PageFrame } from "@/components/pages/PageFrame";

export default function Page() {
  return (
    <PageFrame title="Thermodynamics" intro="Property packages and water properties." fill={false}>
      <ThermoView />
    </PageFrame>
  );
}
