"use client";

import { rowsToCsv } from "@/lib/csv/parsePlantCsv";
import { SAMPLE_ROWS } from "@/lib/data/samplePlantData";
import { useTwin } from "@/lib/store/TwinProvider";
import type { MenuId } from "@/lib/types";

const MENUS: { id: MenuId; label: string }[] = [
  { id: "file", label: "File" },
  { id: "home", label: "Home" },
  { id: "simulation", label: "Simulation" },
  { id: "dynamics", label: "Dynamics" },
  { id: "flowsheet", label: "Flowsheet" },
  { id: "thermodynamics", label: "Thermodynamics" },
  { id: "tools", label: "Tools" },
  { id: "view", label: "View" },
  { id: "help", label: "Help" },
];

export function MenuBar() {
  const twin = useTwin();
  const { menu, setMenu } = twin;

  function downloadSample() {
    const blob = new Blob([rowsToCsv(SAMPLE_ROWS)], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "sample_plant_data.csv";
    link.click();
    URL.revokeObjectURL(url);
    twin.notify("Downloaded sample_plant_data.csv.");
  }

  function unavailable(name: string) {
    twin.notify(`${name} is not part of this heat-exchanger MVP.`);
  }

  const items: Record<MenuId, { label: string; action: () => void }[]> = {
    file: [
      { label: "Load Sample Data", action: twin.loadSample },
      { label: "Upload Plant CSV...", action: () => twin.setUploadOpen(true) },
      { label: "Download Sample CSV", action: downloadSample },
    ],
    home: [],
    simulation: [
      { label: "Run Simulation", action: twin.runSimulation },
      { label: "Stop", action: twin.stopSimulation },
      { label: "Run Digital Twin", action: twin.runDigitalTwin },
    ],
    dynamics: [{ label: "Not in this MVP", action: () => unavailable("Dynamics") }],
    flowsheet: [{ label: "Not in this MVP", action: () => unavailable("Flowsheet editing") }],
    thermodynamics: [
      { label: "Not in this MVP", action: () => unavailable("Thermodynamics packages") },
    ],
    tools: [
      {
        label: "ML Analytics",
        action: () => twin.setBottomTab("simulation"),
      },
      {
        label: "Anomaly Table",
        action: () => twin.setBottomTab("simulation"),
      },
    ],
    view: [
      { label: "Streams", action: () => twin.setBottomTab("streams") },
      { label: "Charts", action: () => twin.setBottomTab("charts") },
      { label: "Messages", action: () => twin.setBottomTab("messages") },
      { label: "Select Heat Exchanger", action: () => twin.selectObject("E-1") },
    ],
    help: [
      {
        label: "About this MVP",
        action: () =>
          twin.notify(
            "Simcourt: Development of Digital Twin Framework for Process Monitoring and Simulation is a browser MVP. Plant rows, the heat-exchanger solve, and the ML scores are dummy client-side data. A later backend can replace lib/data, lib/simulation, and lib/ml.",
          ),
      },
    ],
  };

  return (
    <nav className="relative flex h-7 shrink-0 items-center gap-0.5 border-b border-[#d0d0d0] bg-[#f7f7f7] px-1">
      {MENUS.map((item) => {
        const open = menu === item.id;
        const home = item.id === "home";
        const active = open || (home && menu === null);
        return (
          <div key={item.id} className="relative">
            <button
              type="button"
              onClick={() => setMenu(home ? null : open ? null : item.id)}
              className={`h-6 px-2.5 text-[12px] ${
                active
                  ? "bg-white text-[#1f4e79] shadow-[inset_0_-2px_0_#1f4e79]"
                  : "text-[#243042] hover:bg-[#e7f2fb]"
              }`}
            >
              {item.label}
            </button>
            {open && items[item.id].length > 0 && (
              <div className="absolute left-0 top-full z-40 min-w-[210px] border border-[#c8c8c8] bg-white py-1 shadow-[0_8px_20px_rgba(0,0,0,0.12)]">
                {items[item.id].map((entry) => (
                  <button
                    key={entry.label}
                    type="button"
                    onClick={() => {
                      setMenu(null);
                      entry.action();
                    }}
                    className="block w-full px-3 py-1.5 text-left text-[12px] hover:bg-[#e7f2fb]"
                  >
                    {entry.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}
