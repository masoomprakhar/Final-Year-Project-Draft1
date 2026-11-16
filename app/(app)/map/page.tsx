"use client";

import { FeatureMapView } from "@/components/analysis/FeatureMapView";
import { PageFrame } from "@/components/pages/PageFrame";

export default function Page() {
  return (
    <PageFrame title="Feature Map" intro="Everything in the project: what is live, what is mock, what is planned." fill={false}>
      <FeatureMapView />
    </PageFrame>
  );
}
