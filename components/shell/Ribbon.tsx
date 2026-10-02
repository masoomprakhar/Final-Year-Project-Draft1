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
import type { ReactNode } from "react";
import { StatusPill } from "@/components/StatusPill";
import { UNIT_IDS } from "@/lib/data/unitModels";
import { useTwin } from "@/lib/store/TwinProvider";
import type { ObjectId } from "@/lib/types";

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
        active ? "bg-[#d6ebfa]" : ""
      }`}
    >
      <span className="grid h-7 place-items-center">{children}</span>
      <span className="max-w-[74px] text-center">{label}</span>
    </button>
  );
}

export function Ribbon() {
  const twin = useTwin();

  return (
    <div className="flex h-[76px] shrink-0 items-center border-b border-[#d0d0d0] bg-white">
      <div className="flex h-full items-center px-1">
        <RibbonButton
          label="Add Unit"
          onClick={() => {
            const index = twin.activeUnitId ? UNIT_IDS.indexOf(twin.activeUnitId) : -1;
            twin.openUnit(UNIT_IDS[(index + 1) % UNIT_IDS.length]);
          }}
        >
          <Box className="h-5 w-5" strokeWidth={1.6} />
        </RibbonButton>
        <RibbonButton
          label="Add Stream"
          onClick={() => {
            const order: ObjectId[] = ["S1", "S2", "S3", "S4"];
            const current =
              twin.selection.kind === "object" ? order.indexOf(twin.selection.id) : -1;
            const next = order[(current + 1) % order.length];
            twin.selectObject(next);
            twin.notify(`Material stream ${next} selected.`);
          }}
        >
          <ArrowRightLeft className="h-5 w-5" strokeWidth={1.6} />
        </RibbonButton>
        <RibbonButton label="Connect" onClick={twin.connectActive}>
          <Spline className="h-5 w-5" strokeWidth={1.6} />
        </RibbonButton>
        <RibbonButton label="Auto-Layout" onClick={twin.autoLayout}>
          <LayoutGrid className="h-5 w-5" strokeWidth={1.6} />
        </RibbonButton>
      </div>
      <div className="h-12 w-px bg-[#e3e3e3]" />
      <div className="flex h-full items-center px-1">
        <RibbonButton label="Run Simulation" onClick={twin.runSimulation} width="w-[88px]">
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
