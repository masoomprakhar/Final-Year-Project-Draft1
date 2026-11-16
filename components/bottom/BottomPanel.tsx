"use client";

import { AlertsPanel } from "@/components/bottom/AlertsPanel";
import { ChartsPanel } from "@/components/bottom/ChartsPanel";
import { DatasetsPanel } from "@/components/bottom/DatasetsPanel";
import { MessagesPanel } from "@/components/bottom/MessagesPanel";
import { RunsPanel } from "@/components/bottom/RunsPanel";
import { SimulationPanel } from "@/components/bottom/SimulationPanel";
import { StreamsTable } from "@/components/bottom/StreamsTable";
import { FlowsheetStreamsTable } from "@/components/bottom/FlowsheetStreamsTable";
import { useFlowsheets } from "@/lib/store/FlowsheetProvider";
import { useTwin } from "@/lib/store/TwinProvider";
import type { BottomTab } from "@/lib/types";

const TABS: { id: BottomTab; label: string }[] = [
  { id: "streams", label: "Streams" },
  { id: "simulation", label: "Simulation Results" },
  { id: "charts", label: "Charts" },
  { id: "messages", label: "Messages" },
  { id: "datasets", label: "Datasets" },
  { id: "runs", label: "Runs" },
  { id: "alerts", label: "Alerts" },
];

export function BottomPanel() {
  const { bottomTab, setBottomTab, stored } = useTwin();
  const fs = useFlowsheets();
  const openAlerts = stored.alerts.filter((alert) => !alert.acknowledged).length;

  return (
    <section className="flex h-[292px] shrink-0 flex-col border-t border-[#cfcfcf] bg-white">
      <div className="flex h-7 shrink-0 items-end border-b border-[#d5d5d5] bg-[#f3f3f3] px-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setBottomTab(tab.id)}
            className={`mr-1 h-6 px-3 text-[12px] ${
              bottomTab === tab.id
                ? "border border-b-white bg-white font-semibold text-[#1f4e79]"
                : "text-[#444] hover:bg-[#e7f2fb]"
            }`}
          >
            {tab.label}
            {tab.id === "alerts" && openAlerts > 0 && (
              <span className="ml-1 rounded-full bg-[#b42318] px-1.5 text-[10px] font-semibold text-white">{openAlerts}</span>
            )}
          </button>
        ))}
      </div>
      <div key={bottomTab} className="fade-in min-h-0 flex-1">
        {bottomTab === "streams" && fs.active && <FlowsheetStreamsTable />}
        {bottomTab === "streams" && !fs.active && (
          <div className="grid h-full grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
            <StreamsTable />
            <div className="min-h-0 border-l border-[#e5e5e5]">
              <ChartsPanel embedded />
            </div>
          </div>
        )}
        {bottomTab === "simulation" && <SimulationPanel />}
        {bottomTab === "charts" && <ChartsPanel />}
        {bottomTab === "messages" && <MessagesPanel />}
        {bottomTab === "datasets" && <DatasetsPanel />}
        {bottomTab === "runs" && <RunsPanel />}
        {bottomTab === "alerts" && <AlertsPanel />}
      </div>
    </section>
  );
}
