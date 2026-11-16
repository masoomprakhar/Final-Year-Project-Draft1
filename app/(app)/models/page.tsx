"use client";

import { ModelsPanel } from "@/components/pages/ModelsPanel";
import { PageFrame } from "@/components/pages/PageFrame";

export default function Page() {
  return (
    <PageFrame title="ML Models" intro="Model registry. The demo model is a placeholder; register your trained model here.">
      <ModelsPanel />
    </PageFrame>
  );
}
