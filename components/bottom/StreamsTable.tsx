"use client";

import { formatComposition, formatNumber } from "@/lib/format";
import { useTwin } from "@/lib/store/TwinProvider";
import type { StreamColumn } from "@/lib/types";

const PROPERTIES: { label: string; digits: number; key: keyof StreamColumn }[] = [
  { label: "Temperature (°C)", digits: 1, key: "temperature" },
  { label: "Pressure (bar)", digits: 1, key: "pressure" },
  { label: "Mass Flow (kg/h)", digits: 1, key: "massFlow" },
  { label: "Molar Flow (kmol/h)", digits: 2, key: "molarFlow" },
  { label: "Vapor Fraction", digits: 1, key: "vaporFraction" },
  { label: "Enthalpy (kJ/kg)", digits: 1, key: "enthalpy" },
  { label: "Density (kg/m³)", digits: 1, key: "density" },
];

export function StreamsTable() {
  const { streams, selection, selectObject } = useTwin();
  const selected = selection.kind === "object" ? selection.id : null;

  return (
    <div className="h-full overflow-auto">
      <table className="w-full min-w-[560px] border-collapse text-[12px]">
        <thead className="sticky top-0 bg-[#f7f7f7]">
          <tr>
            <th className="border border-[#e1e1e1] px-2 py-0.5 text-left font-semibold">Material Streams</th>
            {streams.map((stream) => (
              <th
                key={stream.id}
                className={`whitespace-nowrap border border-[#e1e1e1] px-2 py-0.5 text-center font-semibold ${tone(stream.id)} ${
                  selected === stream.id ? "bg-[#d6ebfa]" : ""
                }`}
              >
                <button type="button" onClick={() => selectObject(stream.id)} className="w-full">
                  {stream.id}
                </button>
              </th>
            ))}
          </tr>
          <tr>
            <th className="border border-[#e1e1e1] px-2 py-0.5" />
            {streams.map((stream) => (
              <th
                key={`${stream.id}-name`}
                className={`whitespace-nowrap border border-[#e1e1e1] px-2 py-0.5 text-center text-[11px] font-medium ${tone(stream.id)}`}
              >
                {stream.id === "S3" ? "Cooling Water Inlet" : stream.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {PROPERTIES.map((property) => (
            <tr key={property.key}>
              <th className="whitespace-nowrap border border-[#e6e6e6] px-2 py-0.5 text-left font-medium">{property.label}</th>
              {streams.map((stream) => (
                <td
                  key={`${stream.id}-${property.key}`}
                  className={`whitespace-nowrap border border-[#e6e6e6] px-2 py-0.5 text-right tabular-nums ${
                    selected === stream.id ? "bg-[#f3f8fd]" : ""
                  }`}
                >
                  {formatNumber(Number(stream[property.key]), property.digits)}
                </td>
              ))}
            </tr>
          ))}
          <tr>
            <th colSpan={5} className="border border-[#e6e6e6] bg-[#fafafa] px-2 py-0.5 text-left font-semibold">
              Composition (mass fraction)
            </th>
          </tr>
          <tr>
            <th className="border border-[#e6e6e6] px-2 py-0.5 text-left font-medium">H₂O</th>
            {streams.map((stream) => (
              <td key={`${stream.id}-x`} className="whitespace-nowrap border border-[#e6e6e6] px-2 py-0.5 text-right tabular-nums">
                {formatComposition(stream.composition) === "1.0"
                  ? "1.000"
                  : formatComposition(stream.composition)}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function tone(id: StreamColumn["id"]) {
  return id === "S1" || id === "S2" ? "text-[#a32020]" : "text-[#1d4f91]";
}
