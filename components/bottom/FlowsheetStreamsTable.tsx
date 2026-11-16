"use client";

import { formatNumber } from "@/lib/format";
import { useFlowsheets } from "@/lib/store/FlowsheetProvider";

export function FlowsheetStreamsTable() {
  const fs = useFlowsheets();
  const doc = fs.active!;
  const tag = (id: string | null) => doc.units.find((u) => u.id === id)?.tag ?? "—";
  if (doc.streams.length === 0) {
    return <div className="grid h-full place-items-center text-[12px] text-[#444]">No streams yet. Use Add Stream, or Connect two units.</div>;
  }
  return (
    <div className="h-full overflow-auto">
      <table className="w-full min-w-[640px] border-collapse text-[12px]">
        <thead className="sticky top-0 bg-[#f7f7f7]">
          <tr>
            {["Stream", "From", "To", "Temperature (°C)", "Pressure (bar)", "Mass flow (kg/h)", "Vapor fraction"].map((h) => (
              <th key={h} className="whitespace-nowrap border border-[#e1e1e1] px-2 py-0.5 text-left font-semibold">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {doc.streams.map((s) => {
            const solved = fs.solution?.streams[s.id];
            const value = solved ?? (s.fromUnitId ? null : { ...s, vaporFraction: 0 });
            return (
              <tr
                key={s.id}
                onClick={() => fs.select({ kind: "stream", id: s.id })}
                className={`cursor-pointer ${fs.selection?.id === s.id ? "bg-[#d6ebfa]" : "hover:bg-[#f2f8fd]"}`}
              >
                <td className="border border-[#e1e1e1] px-2 py-0.5 font-semibold">{s.tag}</td>
                <td className="border border-[#e1e1e1] px-2 py-0.5">{tag(s.fromUnitId)}</td>
                <td className="border border-[#e1e1e1] px-2 py-0.5">{tag(s.toUnitId)}</td>
                {value ? (
                  <>
                    <td className="border border-[#e1e1e1] px-2 py-0.5 text-right">{formatNumber(value.temperature, 1)}</td>
                    <td className="border border-[#e1e1e1] px-2 py-0.5 text-right">{formatNumber(value.pressure, 2)}</td>
                    <td className="border border-[#e1e1e1] px-2 py-0.5 text-right">{formatNumber("flow" in value ? value.flow : 0, 1)}</td>
                    <td className="border border-[#e1e1e1] px-2 py-0.5 text-right">{formatNumber(value.vaporFraction, 2)}</td>
                  </>
                ) : (
                  <td colSpan={4} className="border border-[#e1e1e1] px-2 py-0.5 text-[#666]">Run Simulation to calculate</td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
