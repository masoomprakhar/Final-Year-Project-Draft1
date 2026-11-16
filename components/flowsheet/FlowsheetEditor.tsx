"use client";

import { useEffect, useRef, useState } from "react";
import { CATALOG, UNIT_TYPES } from "@/lib/flowsheet/flowsheetCatalog";
import { UNIT_HEIGHT, UNIT_WIDTH } from "@/lib/flowsheet/flowsheetLayout";
import type { FlowDoc, FlowStream, FlowUnit } from "@/lib/flowsheet/flowsheetTypes";
import { formatNumber } from "@/lib/format";
import { useFlowsheets } from "@/lib/store/FlowsheetProvider";

const STUB = 80;
const STATUS_STROKE = { ok: "#3f8f4f", warning: "#b7791f", error: "#b42318" } as const;

function portPoint(unit: FlowUnit, side: "in" | "out", port: number) {
  const entry = CATALOG[unit.type];
  const count = side === "in" ? entry.inlets : entry.outlets;
  const gap = UNIT_HEIGHT / (count + 1);
  return {
    x: unit.x + (side === "in" ? -UNIT_WIDTH / 2 : UNIT_WIDTH / 2),
    y: unit.y - UNIT_HEIGHT / 2 + gap * (port + 1),
  };
}

function streamEnds(doc: FlowDoc, stream: FlowStream) {
  const from = doc.units.find((u) => u.id === stream.fromUnitId);
  const to = doc.units.find((u) => u.id === stream.toUnitId);
  const start = from ? portPoint(from, "out", stream.fromPort) : to ? (() => {
    const end = portPoint(to, "in", stream.toPort);
    return { x: end.x - STUB, y: end.y };
  })() : null;
  const end = to ? portPoint(to, "in", stream.toPort) : from ? { x: start!.x + STUB, y: start!.y } : null;
  return start && end ? { start, end } : null;
}

export function FlowsheetEditor() {
  const fs = useFlowsheets();
  const doc = fs.active!;
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ id: string; dx: number; dy: number; moved: boolean } | null>(null);
  const [, force] = useState(0);
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const tag = (event.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if ((event.key === "Delete" || event.key === "Backspace") && fs.selection) {
        event.preventDefault();
        fs.deleteSelected();
      } else if (event.key === "Escape" && fs.connectMode) fs.toggleConnect();
      else if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        void fs.run();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const hint = fs.connectMode
    ? fs.pending ? "Now click the unit (or stream) to join it to." : "Connect is on: click a unit or stream to start. Esc to stop."
    : doc.units.length === 0 ? "Start here: choose “Add unit” and pick a heater, pump, mixer…"
    : doc.streams.length === 0 ? "Next: click Connect, then click one unit and then another to join them with a stream."
    : !fs.solution ? "Ready: press Run (Ctrl+Enter) to calculate. Drag units to rearrange; click a unit or stream to edit it on the right."
    : fs.solution.ok ? "Solved. Click any unit or stream to see its results on the right." : "Not solved: see the problems listed under Flowsheet on the right.";
  const toolBtn = "h-7 border border-[#c5c5c5] bg-white px-2.5 text-[12px] hover:bg-[#e7f2fb]";

  const width = Math.max(1000, ...doc.units.map((u) => u.x + UNIT_WIDTH / 2 + STUB + 60));
  const height = Math.max(460, ...doc.units.map((u) => u.y + UNIT_HEIGHT / 2 + 80));
  const floating = doc.streams.filter((s) => !s.fromUnitId && !s.toUnitId);

  function toSvg(event: React.PointerEvent) {
    const svg = svgRef.current!;
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    return point.matrixTransform(svg.getScreenCTM()!.inverse());
  }

  const isPending = (kind: "unit" | "stream", id: string) => fs.pending?.kind === kind && fs.pending.id === id;
  const isSelected = (kind: "unit" | "stream", id: string) => fs.selection?.kind === kind && fs.selection.id === id;

  return (
    <div className="relative flex h-full flex-col" data-flow={fs.solution ? (fs.solution.ok ? "done" : "idle") : "idle"}>
      <div className="relative z-10 flex shrink-0 flex-wrap items-center gap-1.5 border-b border-[#e1e1e1] bg-[#fafafa] px-2 py-1.5">
        <div className="relative">
          <button type="button" className={`${toolBtn} font-semibold text-[#1f4e79]`} onClick={() => setMenu(!menu)}>＋ Add unit ▾</button>
          {menu && (
            <div className="absolute left-0 top-8 z-20 w-48 border border-[#c9c9c9] bg-white py-1 shadow-md">
              {UNIT_TYPES.map((type) => (
                <button key={type} type="button" onClick={() => { fs.addUnit(type); setMenu(false); }} className="block w-full px-3 py-1 text-left text-[12px] hover:bg-[#e7f2fb]">
                  {CATALOG[type].label}
                </button>
              ))}
            </div>
          )}
        </div>
        <button type="button" className={toolBtn} onClick={fs.addStream}>＋ Add stream</button>
        <button type="button" className={`${toolBtn} ${fs.connectMode ? "!border-[#e07b00] !bg-[#fff1dc] font-semibold" : ""}`} onClick={fs.toggleConnect}>
          {fs.connectMode ? "● Connecting… (Esc)" : "⇄ Connect"}
        </button>
        <button type="button" className={toolBtn} onClick={fs.autoLayout}>▦ Tidy layout</button>
        <button type="button" className={`${toolBtn} text-[#b42318] disabled:opacity-40`} disabled={!fs.selection} onClick={fs.deleteSelected}>🗑 Delete selected</button>
        <button type="button" className="ml-auto h-7 border border-[#1f8a3b] bg-[#1f8a3b] px-3 text-[12px] font-semibold text-white hover:bg-[#177030]" onClick={() => void fs.run()}>▶ Run</button>
      </div>
      <p className="shrink-0 border-b border-[#e8e8e8] bg-[#f4f9ff] px-3 py-1 text-[12px] text-[#1f4e79]">💡 {hint}</p>
      {doc.units.length === 0 && doc.streams.length === 0 && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center text-[13px] text-[#555]">
          <div>
            <p className="font-semibold">Empty flowsheet</p>
            <p>Pick a unit in the palette or use Add Unit, then Connect to draw streams.</p>
          </div>
        </div>
      )}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className="min-h-0 w-full flex-1 select-none"
        role="img"
        aria-label={`${doc.name} flowsheet`}
        onPointerDown={(event) => {
          if (event.target === svgRef.current) {
            fs.select(null);
          }
        }}
        onPointerMove={(event) => {
          const d = drag.current;
          if (!d) return;
          const p = toSvg(event);
          d.moved = true;
          fs.moveUnit(d.id, Math.max(70, Math.round(p.x - d.dx)), Math.max(50, Math.round(p.y - d.dy)));
        }}
        onPointerUp={() => {
          drag.current = null;
          force((n) => n + 1);
        }}
      >
        <defs>
          <marker id="fsArrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#1f5fd0" />
          </marker>
          <marker id="fsArrowSel" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#e07b00" />
          </marker>
        </defs>

        {doc.streams.map((stream) => {
          const ends = streamEnds(doc, stream);
          if (!ends) return null;
          const { start, end } = ends;
          const solved = fs.solution?.streams[stream.id];
          const selected = isSelected("stream", stream.id) || isPending("stream", stream.id);
          const bend = Math.max(30, (end.x - start.x) / 2);
          const path = `M ${start.x} ${start.y} C ${start.x + bend} ${start.y}, ${end.x - bend} ${end.y}, ${end.x} ${end.y}`;
          const mid = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
          const stroke = selected ? "#e07b00" : "#1f5fd0";
          return (
            <g
              key={stream.id}
              className="cursor-pointer"
              onPointerDown={(event) => {
                event.stopPropagation();
                fs.clickTarget({ kind: "stream", id: stream.id });
              }}
            >
              <path d={path} fill="none" stroke="transparent" strokeWidth={14} />
              <path className="flow-line" d={path} fill="none" stroke={stroke} strokeWidth={selected ? 3 : 2} markerEnd={selected ? "url(#fsArrowSel)" : "url(#fsArrow)"} />
              <text x={mid.x} y={mid.y - 8} textAnchor="middle" fontSize={12} fontWeight={650} fill="#1f2933" stroke="white" strokeWidth={3} paintOrder="stroke">
                {stream.tag}
              </text>
              {solved && (
                <text x={mid.x} y={mid.y + 14} textAnchor="middle" fontSize={10.5} fill="#364152" stroke="white" strokeWidth={3} paintOrder="stroke">
                  {formatNumber(solved.temperature, 1)} °C · {formatNumber(solved.pressure, 2)} bar · {formatNumber(solved.flow, 1)} kg/h
                </text>
              )}
            </g>
          );
        })}

        {doc.units.map((unit) => {
          const entry = CATALOG[unit.type];
          const outcome = fs.solution?.units[unit.id];
          const selected = isSelected("unit", unit.id) || isPending("unit", unit.id);
          const stroke = selected ? "#e07b00" : outcome ? STATUS_STROKE[outcome.status] : "#4e5d68";
          return (
            <g
              key={unit.id}
              className={`${fs.connectMode ? "cursor-crosshair" : "cursor-grab"} ${selected ? "unit-selected" : outcome?.status === "ok" ? "unit-ok" : outcome?.status === "error" ? "unit-error" : ""}`}
              onPointerDown={(event) => {
                event.stopPropagation();
                fs.clickTarget({ kind: "unit", id: unit.id });
                if (!fs.connectMode) {
                  const p = toSvg(event);
                  drag.current = { id: unit.id, dx: p.x - unit.x, dy: p.y - unit.y, moved: false };
                  (event.currentTarget.ownerSVGElement as SVGSVGElement).setPointerCapture?.(event.pointerId);
                }
              }}
            >
              <rect
                x={unit.x - UNIT_WIDTH / 2}
                y={unit.y - UNIT_HEIGHT / 2}
                width={UNIT_WIDTH}
                height={UNIT_HEIGHT}
                rx={8}
                fill="#f7f8fa"
                stroke={stroke}
                strokeWidth={selected ? 3 : 2}
              />
              <text x={unit.x} y={unit.y - 4} textAnchor="middle" fontSize={14} fontWeight={700} fill="#1f2933">
                {unit.tag}
              </text>
              <text x={unit.x} y={unit.y + 14} textAnchor="middle" fontSize={11} fill="#52606d">
                {entry.label}
              </text>
              {Array.from({ length: entry.inlets }, (_, port) => {
                const p = portPoint(unit, "in", port);
                return <circle key={`i${port}`} cx={p.x} cy={p.y} r={4} fill="#fff" stroke="#4e5d68"><title>{entry.inletLabels[port]}</title></circle>;
              })}
              {Array.from({ length: entry.outlets }, (_, port) => {
                const p = portPoint(unit, "out", port);
                return <circle key={`o${port}`} cx={p.x} cy={p.y} r={4} fill="#4e5d68" stroke="#4e5d68"><title>{entry.outletLabels[port]}</title></circle>;
              })}
            </g>
          );
        })}

        {floating.map((stream, index) => {
          const selected = isSelected("stream", stream.id) || isPending("stream", stream.id);
          return (
            <g
              key={stream.id}
              className="cursor-pointer"
              onPointerDown={(event) => {
                event.stopPropagation();
                fs.clickTarget({ kind: "stream", id: stream.id });
              }}
            >
              <rect x={12} y={12 + index * 30} width={150} height={24} rx={4} fill="#eef4fc" stroke={selected ? "#e07b00" : "#1f5fd0"} strokeWidth={selected ? 2.5 : 1.2} strokeDasharray="4 3" />
              <text x={22} y={28 + index * 30} fontSize={12} fill="#1f2933">
                {stream.tag} · unattached stream
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
