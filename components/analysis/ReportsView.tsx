"use client";

import { formatNumber } from "@/lib/format";
import { useTwin } from "@/lib/store/TwinProvider";

function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export function ReportsView() {
  const { streams, result, selectedRow, rows, results, predictions } = useTwin();
  const streamCsv = () =>
    download("streams.csv", ["id,name,temperature_C,pressure_bar,mass_flow_kg_h,molar_flow_kmol_h,vapor_fraction,enthalpy_kJ_kg,density_kg_m3",
      ...streams.map((s) => [s.id, s.name, s.temperature, s.pressure, s.massFlow, s.molarFlow, s.vaporFraction, s.enthalpy, s.density].join(","))].join("\n"));
  const runsCsv = () =>
    download("run_summary.csv", ["timestamp,status,hot_out_C,cold_out_C,duty_kW,ml_duty_kW",
      ...rows.map((r) => { const o = results[r.id]; const p = predictions[r.id];
        return [r.timestamp, o?.status ?? "", o?.hot_outlet_temperature ?? "", o?.cold_outlet_temperature ?? "", o?.heat_duty ?? "", p?.heat_duty ?? ""].join(","); })].join("\n"));
  return (
    <div className="space-y-4 p-4 text-[12px] print:p-0">
      <div className="flex gap-2 print:hidden">
        <button type="button" onClick={streamCsv} className="h-7 border border-[#1f4e79] px-3 font-semibold text-[#1f4e79] hover:bg-[#e7f1fb]">Download streams (CSV)</button>
        <button type="button" onClick={runsCsv} className="h-7 border border-[#1f4e79] px-3 font-semibold text-[#1f4e79] hover:bg-[#e7f1fb]">Download run summary (CSV)</button>
        <button type="button" onClick={() => window.print()} className="h-7 border border-[#1f4e79] px-3 font-semibold text-[#1f4e79] hover:bg-[#e7f1fb]">Print / save as PDF</button>
      </div>
      <h2 className="text-[15px] font-semibold">Heat exchanger report · case {selectedRow.timestamp}</h2>
      <table className="w-full max-w-3xl border-collapse">
        <thead className="bg-[#f7f7f7]"><tr>{["Stream", "T (°C)", "P (bar)", "Flow (kg/h)", "Enthalpy (kJ/kg)"].map((h) => <th key={h} className="border border-[#e1e1e1] px-2 py-1 text-left">{h}</th>)}</tr></thead>
        <tbody>{streams.map((s) => (
          <tr key={s.id}><td className="border border-[#eee] px-2 py-0.5">{s.id} {s.name}</td>
            <td className="border border-[#eee] px-2 py-0.5">{formatNumber(s.temperature, 1)}</td>
            <td className="border border-[#eee] px-2 py-0.5">{formatNumber(s.pressure, 1)}</td>
            <td className="border border-[#eee] px-2 py-0.5">{formatNumber(s.massFlow, 1)}</td>
            <td className="border border-[#eee] px-2 py-0.5">{formatNumber(s.enthalpy, 1)}</td></tr>
        ))}</tbody>
      </table>
      <p>Status {result.status} · duty {formatNumber(result.heat_duty, 1)} kW · LMTD {formatNumber(result.lmtd, 1)} °C · ΔP hot {formatNumber(result.pressure_drop_hot, 2)} bar, cold {formatNumber(result.pressure_drop_cold, 2)} bar. Mock physics.</p>
    </div>
  );
}
