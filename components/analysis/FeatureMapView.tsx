"use client";

import Link from "next/link";
import { FEATURES, type FeatureStatus } from "@/lib/featureMap";

const COLOR: Record<FeatureStatus, string> = { Live: "bg-[#e3f4e8] text-[#0f7a32]", Mock: "bg-[#fff3d6] text-[#8a5a00]", Planned: "bg-[#eceff3] text-[#445]" };

export function FeatureMapView() {
  const counts = FEATURES.reduce<Record<string, number>>((acc, f) => ({ ...acc, [f.status]: (acc[f.status] ?? 0) + 1 }), {});
  return (
    <div className="space-y-3 p-4 text-[12px]">
      <p>{counts.Live} live · {counts.Mock} mock (working UI, placeholder data/physics) · {counts.Planned} planned.</p>
      <table className="w-full border-collapse">
        <thead className="bg-[#f7f7f7]"><tr>{["Area", "Feature", "Status", "Open", "Code", "Note"].map((h) => <th key={h} className="border border-[#e1e1e1] px-2 py-1 text-left">{h}</th>)}</tr></thead>
        <tbody>{FEATURES.map((f) => (
          <tr key={f.name}>
            <td className="border border-[#eee] px-2 py-0.5">{f.area}</td>
            <td className="border border-[#eee] px-2 py-0.5 font-semibold">{f.name}</td>
            <td className="border border-[#eee] px-2 py-0.5"><span className={`px-1.5 py-0.5 ${COLOR[f.status]}`}>{f.status}</span></td>
            <td className="border border-[#eee] px-2 py-0.5">{f.route ? <Link href={f.route} className="text-[#1f4e79] underline">{f.route}</Link> : "—"}</td>
            <td className="border border-[#eee] px-2 py-0.5"><code>{f.where}</code></td>
            <td className="border border-[#eee] px-2 py-0.5">{f.note}</td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}
