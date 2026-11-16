"use client";

import { PACKAGES, waterProperties } from "@/lib/thermo";

const TEMPS = [10, 20, 25, 30, 35, 40, 50, 60, 70, 80, 90];

export function ThermoView() {
  return (
    <div className="space-y-5 p-4 text-[12px]">
      <p className="rounded border border-[#e8c46c] bg-[#fff8e5] p-2">MOCK: water correlations only. A real property package arrives with the DWSIM service.</p>
      <table className="w-full max-w-3xl border-collapse">
        <thead className="bg-[#f7f7f7]"><tr>{["Package", "Best for", "Status"].map((h) => <th key={h} className="border border-[#e1e1e1] px-2 py-1 text-left">{h}</th>)}</tr></thead>
        <tbody>{PACKAGES.map((p) => (
          <tr key={p.id}><td className="border border-[#eee] px-2 py-1 font-semibold">{p.name}</td><td className="border border-[#eee] px-2 py-1">{p.fit}</td><td className="border border-[#eee] px-2 py-1">{p.status}</td></tr>
        ))}</tbody>
      </table>
      <table className="w-full max-w-3xl border-collapse">
        <thead className="bg-[#f7f7f7]"><tr>{["T (°C)", "Density (kg/m³)", "Viscosity (mPa·s)", "Cp (kJ/kg·K)", "Conductivity (W/m·K)"].map((h) => <th key={h} className="border border-[#e1e1e1] px-2 py-1 text-right">{h}</th>)}</tr></thead>
        <tbody>{TEMPS.map(waterProperties).map((p) => (
          <tr key={p.t}>
            <td className="border border-[#eee] px-2 py-0.5 text-right">{p.t}</td>
            <td className="border border-[#eee] px-2 py-0.5 text-right">{p.density.toFixed(1)}</td>
            <td className="border border-[#eee] px-2 py-0.5 text-right">{p.viscosityMPas.toFixed(3)}</td>
            <td className="border border-[#eee] px-2 py-0.5 text-right">{p.cp.toFixed(3)}</td>
            <td className="border border-[#eee] px-2 py-0.5 text-right">{p.conductivity.toFixed(3)}</td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}
