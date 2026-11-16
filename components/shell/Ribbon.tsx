"use client";

import {
  Activity,
  ArrowRightLeft,
  Box,
  Flame,
  LayoutGrid,
  LineChart,
  Play,
  Spline,
  Square,
  Table,
  TrendingUp,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { StatusPill } from "@/components/StatusPill";
import { CATALOG, UNIT_TYPES } from "@/lib/flowsheet/flowsheetCatalog";
import { useFlowsheets } from "@/lib/store/FlowsheetProvider";
import { useTwin } from "@/lib/store/TwinProvider";

function RibbonButton({
  label,
  active,
  onClick,
  children,
  width = "w-[78px]",
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
  width?: string;
}) {
  return (
    <button
      type="button"
      title={label}
      onClick={onClick}
      className={`flex h-[68px] ${width} flex-col items-center justify-center gap-1 px-1 text-[11px] leading-[1.15] text-[#243042] hover:bg-[#e7f2fb] ${
        active ? (label === "Run Simulation" ? "bg-[#d6ebfa] ribbon-active" : "bg-[#d6ebfa]") : ""
      }`}
    >
      <span className="grid h-7 place-items-center">{children}</span>
      <span className="max-w-[74px] text-center">{label}</span>
    </button>
  );
}

export function Ribbon() {
  const twin = useTwin();
  const fs = useFlowsheets();
  const [unitMenu, setUnitMenu] = useState(false);

  return (
    <div className="relative flex h-[76px] shrink-0 items-center border-b border-[#d0d0d0] bg-white">
      {twin.status === "Running" && <div className="progress-bar" />}
      <div className="flex h-full items-center px-1">
        <div className="relative">
          <RibbonButton label="Add Unit" active={unitMenu} onClick={() => setUnitMenu((open) => !open)}>
            <Box className="h-5 w-5" strokeWidth={1.6} />
          </RibbonButton>
          {unitMenu && (
            <div className="absolute left-0 top-[68px] z-30 w-44 border border-[#c9c9c9] bg-white py-1 shadow-md">
              {UNIT_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    fs.addUnit(type);
                    setUnitMenu(false);
                  }}
                  className="block w-full px-3 py-1 text-left text-[12px] hover:bg-[#e7f2fb]"
                >
                  {CATALOG[type].label}
                </button>
              ))}
            </div>
          )}
        </div>
        <RibbonButton label="Add Stream" onClick={fs.addStream}>
          <ArrowRightLeft className="h-5 w-5" strokeWidth={1.6} />
        </RibbonButton>
        <RibbonButton label="Connect" active={fs.connectMode} onClick={fs.active ? fs.toggleConnect : twin.connectActive}>
          <Spline className="h-5 w-5" strokeWidth={1.6} />
        </RibbonButton>
        <RibbonButton label="Auto-Layout" onClick={fs.active ? fs.autoLayout : twin.autoLayout}>
          <LayoutGrid className="h-5 w-5" strokeWidth={1.6} />
        </RibbonButton>
      </div>
      <div className="h-12 w-px bg-[#e3e3e3]" />
      <div className="flex h-full items-center px-1">
        <RibbonButton label="Run Simulation" active={twin.status === "Running"} onClick={fs.active ? () => void fs.run() : twin.runSimulation} width="w-[88px]">
          <Play className="h-6 w-6 fill-[#1f8a3b] text-[#1f8a3b]" />
        </RibbonButton>
        <RibbonButton label="Stop" onClick={twin.stopSimulation} width="w-[64px]">
          <Square className="h-4 w-4 fill-[#b42318] text-[#b42318]" />
        </RibbonButton>
      </div>
      <div className="h-12 w-px bg-[#e3e3e3]" />
      <div className="flex h-full items-center px-1">
        <RibbonButton
          label="Results"
          active={twin.bottomTab === "simulation"}
          onClick={() => twin.setBottomTab("simulation")}
        >
          <Table className="h-5 w-5" strokeWidth={1.6} />
        </RibbonButton>
        <RibbonButton
          label="Stream Table"
          active={twin.bottomTab === "streams"}
          onClick={() => {
            twin.setBottomTab("streams");
            twin.setChartTab("temperature");
          }}
        >
          <Table className="h-5 w-5" strokeWidth={1.6} />
        </RibbonButton>
      </div>
      <div className="h-12 w-px bg-[#e3e3e3]" />
      <div className="flex h-full items-center px-1">
        <RibbonButton
          label="Energy Analysis"
          active={twin.propertyTab === "results" && twin.selection.kind === "object"}
          onClick={() => {
            if (twin.activeUnitId) {
              twin.setPropertyTab("results");
              return;
            }
            twin.selectObject("E-1");
            twin.setPropertyTab("results");
          }}
        >
          <Flame className="h-5 w-5" strokeWidth={1.6} />
        </RibbonButton>
        <RibbonButton
          label="Sensitivity"
          active={twin.chartTab === "sensitivity"}
          onClick={twin.showSensitivity}
        >
          <LineChart className="h-5 w-5" strokeWidth={1.6} />
        </RibbonButton>
        <RibbonButton label="Data Fit" onClick={() => twin.setBottomTab("simulation")}>
          <Activity className="h-5 w-5" strokeWidth={1.6} />
        </RibbonButton>
        <RibbonButton label="Optimization" onClick={twin.optimize}>
          <TrendingUp className="h-5 w-5" strokeWidth={1.6} />
        </RibbonButton>
      </div>
      <div className="ml-auto flex items-center gap-3 pr-3">
        <StatusPill status={twin.status} />
        <div className="text-right text-[11px] leading-tight text-[#3c3c3c]">
          <div>{twin.selectedRow.timestamp}</div>
          <div className="text-[#6b7280]">Mock physics</div>
        </div>
      </div>
    </div>
  );
}
