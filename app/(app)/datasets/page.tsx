"use client";

import { DatasetsPanel } from "@/components/bottom/DatasetsPanel";
import { PageFrame } from "@/components/pages/PageFrame";

export default function Page() {
  return (
    <PageFrame title="Datasets" intro="Datasets you uploaded or generated. Open one to load it into the workbench.">
      <DatasetsPanel />
    </PageFrame>
  );
}
