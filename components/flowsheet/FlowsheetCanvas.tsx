"use client";

import { X } from "lucide-react";
import { formatComposition, formatNumber } from "@/lib/format";
import { useTwin } from "@/lib/store/TwinProvider";
import type { StreamColumn } from "@/lib/types";

const HOT = "#d42727";
const COLD = "#1f5fd0";

export function FlowsheetCanvas() {
  const twin = useTwin();
  const { streams, selection, selectObject, unitView, openFlowsheet, openUnit, cycleFlowsheet } = twin;
  const byId = Object.fromEntries(streams.map((stream) => [stream.id, stream])) as Record<
    StreamColumn["id"],
    StreamColumn
  >;
  const selected = selection.kind === "object" ? selection.id : null;
  const extraTab =
    unitView && unitView.id !== "heater" && unitView.id !== "cooler"
      ? { id: unitView.id, label: `${unitView.typeLabel} ${unitView.name}` }
      : null;
  const tabs = [
    { id: null as string | null, label: "Main Flowsheet" },
    { id: "heater", label: "Heater H-1" },
    { id: "cooler", label: "Cooler C-1" },
    ...(extraTab ? [extraTab] : []),
  ];

  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col bg-white">
      <div className="flex h-8 shrink-0 items-end gap-1 border-b border-[#d5d5d5] bg-[#f3f3f3] px-1">
        {tabs.map((tab) => {
          const active = (twin.activeUnitId ?? null) === tab.id;
          return (
            <div
              key={tab.label}
              className={`flex h-7 items-center gap-2 border px-3 text-[12px] ${
                active ? "border-b-white bg-white" : "border-transparent bg-[#f3f3f3] text-[#555]"
              }`}
            >
              <button type="button" onClick={() => (tab.id ? openUnit(tab.id) : openFlowsheet())}>
                {tab.label}
              </button>
              {tab.id && (
                <button type="button" title="Close flowsheet" onClick={openFlowsheet} className="text-[#666]">
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          );
        })}
        <button
          type="button"
          title="Cycle flowsheets"
          onClick={cycleFlowsheet}
          className="grid h-7 w-7 place-items-center text-[16px] text-[#444] hover:bg-[#e7f2fb]"
        >
          +
        </button>
      </div>
      <div className="min-h-0 flex-1">
        {unitView ? (
          <UnitDiagram viewName={unitView.name} typeLabel={unitView.typeLabel} streams={unitView.streams} connections={unitView.connections} />
        ) : (
        <svg viewBox="0 0 1000 480" className="h-full w-full" role="img" aria-label="Heat exchanger flowsheet">
          <defs>
            <marker id="arrowHot" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto">
              <path d="M 0 0 L 10 5 L 0 10 z" fill={HOT} />
            </marker>
            <marker id="arrowCold" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto">
              <path d="M 0 0 L 10 5 L 0 10 z" fill={COLD} />
            </marker>
          </defs>
          <path d="M 212 94 H 276" stroke={HOT} strokeWidth="2.4" fill="none" />
          <path d="M 324 94 H 400 V 206 H 430" stroke={HOT} strokeWidth="2.4" fill="none" markerEnd="url(#arrowHot)" />
          <path d="M 674 206 H 748 V 94 H 788" stroke={HOT} strokeWidth="2.4" fill="none" markerEnd="url(#arrowHot)" />
          <path d="M 212 384 H 276" stroke={COLD} strokeWidth="2.4" fill="none" />
          <path d="M 324 384 H 400 V 254 H 430" stroke={COLD} strokeWidth="2.4" fill="none" markerEnd="url(#arrowCold)" />
          <path d="M 674 254 H 748 V 384 H 788" stroke={COLD} strokeWidth="2.4" fill="none" markerEnd="url(#arrowCold)" />

          <StreamCard
            x={24}
            y={28}
            stream={byId.S1}
            title="S1 - Hot Feed"
            selected={selected === "S1"}
            onSelect={() => selectObject("S1")}
          />
          <StreamCard
            x={788}
            y={28}
            stream={byId.S2}
            title="S2 - Hot Outlet"
            selected={selected === "S2"}
            onSelect={() => selectObject("S2")}
          />
          <StreamCard
            x={24}
            y={318}
            stream={byId.S3}
            title="S3 - Cooling Water"
            selected={selected === "S3"}
            onSelect={() => selectObject("S3")}
          />
          <StreamCard
            x={788}
            y={318}
            stream={byId.S4}
            title="S4 - Cold Outlet"
            selected={selected === "S4"}
            onSelect={() => selectObject("S4")}
          />
          <Pump cx={300} cy={94} label="P-1" selected={selected === "P-1"} onSelect={() => selectObject("P-1")} />
          <Pump cx={300} cy={384} label="P-2" selected={selected === "P-2"} onSelect={() => selectObject("P-2")} />
          <Exchanger selected={selected === "E-1"} onSelect={() => selectObject("E-1")} />
        </svg>
        )}
      </div>
    </section>
  );
}

function UnitDiagram({
  viewName,
  typeLabel,
  streams,
  connections,
}: {
  viewName: string;
  typeLabel: string;
  streams: StreamColumn[];
  connections: string;
}) {
  return (
    <svg viewBox="0 0 1000 480" className="h-full w-full" role="img" aria-label={`${viewName} flowsheet`}>
      <text x="40" y="36" fontSize="16" fill="#1f4e79" fontWeight="600">
        {typeLabel} {viewName}
      </text>
      <text x="40" y="58" fontSize="12" fill="#555">
        {connections}
      </text>
      <rect x="390" y="170" width="220" height="110" rx="8" fill="#f7fbff" stroke="#1f4e79" strokeWidth="2" />
      <text x="500" y="220" textAnchor="middle" fontSize="18" fill="#1f4e79" fontWeight="600">
        {viewName}
      </text>
      <text x="500" y="244" textAnchor="middle" fontSize="13" fill="#555">
        {typeLabel}
      </text>
      {streams.map((stream, index) => {
        const positions = [
          { x: 40, y: 150 },
          { x: 700, y: 150 },
          { x: 40, y: 320 },
          { x: 700, y: 320 },
        ];
        const spot = positions[index] ?? { x: 370, y: 340 };
        return (
          <g key={`${stream.id}-${stream.name}`}>
            <rect x={spot.x} y={spot.y} width="220" height="92" rx="4" fill="#fff" stroke="#c5c5c5" />
            <text x={spot.x + 12} y={spot.y + 22} fontSize="13" fill="#243042" fontWeight="600">
              {stream.name}
            </text>
            <text x={spot.x + 12} y={spot.y + 44} fontSize="12" fill="#333">
              {`F = ${formatNumber(stream.massFlow, 1)} kg/h`}
            </text>
            <text x={spot.x + 12} y={spot.y + 62} fontSize="12" fill="#333">
              {`T = ${formatNumber(stream.temperature, 1)} °C   P = ${formatNumber(stream.pressure, 1)} bar`}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function StreamCard({
  x,
  y,
  stream,
  title,
  selected,
  onSelect,
}: {
  x: number;
  y: number;
  stream: StreamColumn | undefined;
  title: string;
  selected: boolean;
  onSelect: () => void;
}) {
  const lines = stream
    ? [
        `F = ${formatNumber(stream.massFlow, 1)} kg/h`,
        `T = ${formatNumber(stream.temperature, 1)} °C`,
        `P = ${formatNumber(stream.pressure, 1)} bar`,
        `x(H2O) = ${formatComposition(stream.composition)}`,
      ]
    : [];

  return (
    <g onClick={onSelect} className="cursor-pointer">
      <rect
        x={x}
        y={y}
        width={188}
        height={132}
        rx={2}
        fill="#ffffff"
        stroke={selected ? "#2b7cd3" : "#b7bec6"}
        strokeWidth={selected ? 2 : 1}
      />
      <text x={x + 12} y={y + 22} fontSize={13} fontWeight={700} fill="#1f2933">
        {title}
      </text>
      {lines.map((line, index) => (
        <text key={line} x={x + 12} y={y + 46 + index * 18} fontSize={12.5} fill="#243042">
          {line}
        </text>
      ))}
    </g>
  );
}

function Pump({
  cx,
  cy,
  label,
  selected,
  onSelect,
}: {
  cx: number;
  cy: number;
  label: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <g onClick={onSelect} className="cursor-pointer">
      <circle
        cx={cx}
        cy={cy}
        r={24}
        fill="#f4f6f8"
        stroke={selected ? "#2b7cd3" : "#5c6b76"}
        strokeWidth={selected ? 2.4 : 1.6}
      />
      <circle cx={cx} cy={cy} r={8} fill="none" stroke="#5c6b76" strokeWidth={1.4} />
      <path d={`M ${cx - 3} ${cy - 8} L ${cx + 6} ${cy} L ${cx - 3} ${cy + 8} Z`} fill="#5c6b76" />
      <text x={cx} y={cy + 44} textAnchor="middle" fontSize={12} fontWeight={650} fill="#1f2933">
        {label}
      </text>
    </g>
  );
}

function Exchanger({ selected, onSelect }: { selected: boolean; onSelect: () => void }) {
  return (
    <g onClick={onSelect} className="cursor-pointer">
      <text x={552} y={156} textAnchor="middle" fontSize={14} fontWeight={700} fill="#1f2933">
        E-1
      </text>
      <line x1={430} y1={206} x2={468} y2={206} stroke="#5c6b76" strokeWidth={4} />
      <line x1={430} y1={254} x2={468} y2={254} stroke="#5c6b76" strokeWidth={4} />
      <line x1={636} y1={206} x2={674} y2={206} stroke="#5c6b76" strokeWidth={4} />
      <line x1={636} y1={254} x2={674} y2={254} stroke="#5c6b76" strokeWidth={4} />
      <rect
        x={468}
        y={176}
        width={168}
        height={108}
        rx={54}
        fill="#f7f8fa"
        stroke={selected ? "#2b7cd3" : "#4e5d68"}
        strokeWidth={selected ? 2.6 : 1.8}
      />
      <line x1={498} y1={206} x2={606} y2={206} stroke="#8b98a3" strokeWidth={1.4} />
      <line x1={498} y1={230} x2={606} y2={230} stroke="#8b98a3" strokeWidth={1.4} />
      <line x1={498} y1={254} x2={606} y2={254} stroke="#8b98a3" strokeWidth={1.4} />
      <ellipse cx={468} cy={230} rx={12} ry={52} fill="#eef1f4" stroke="#4e5d68" />
      <ellipse cx={636} cy={230} rx={12} ry={52} fill="#eef1f4" stroke="#4e5d68" />
      <text x={552} y={312} textAnchor="middle" fontSize={13} fill="#1f2933">
        Heat Exchanger
      </text>
    </g>
  );
}
