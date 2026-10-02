"use client";

import { ChartsPanel } from "@/components/bottom/ChartsPanel";
import { MessagesPanel } from "@/components/bottom/MessagesPanel";
import { SimulationPanel } from "@/components/bottom/SimulationPanel";
import { StreamsTable } from "@/components/bottom/StreamsTable";
import { useTwin } from "@/lib/store/TwinProvider";
import type { BottomTab } from "@/lib/types";

const TABS: { id: BottomTab; label: string }[] = [
  { id: "streams", label: "Streams" },
  { id: "simulation", label: "Simulation Results" },
  { id: "charts", label: "Charts" },
  { id: "messages", label: "Messages" },
];

export function BottomPanel() {
  const { bottomTab, setBottomTab } = useTwin();

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
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1">
        {bottomTab === "streams" && (
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
      </div>
    </section>
  );
}
