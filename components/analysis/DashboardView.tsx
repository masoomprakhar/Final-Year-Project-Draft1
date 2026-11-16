"use client";

import Link from "next/link";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatNumber } from "@/lib/format";
import { useTwin } from "@/lib/store/TwinProvider";

export function DashboardView() {
  const { rows, results, predictions, stored, userEmail, successCount, failedCount, selectedRow, result } = useTwin();
  const trend = rows.map((r) => ({
    t: r.timestamp.slice(11),
    actual: r.hot_outlet_actual,
    physics: results[r.id]?.hot_outlet_temperature,
    ml: predictions[r.id]?.hot_outlet_temperature,
  }));
  const open = stored.alerts.filter((a) => !a.acknowledged).length;
  const tiles: [string, string][] = [
    ["Rows loaded", String(rows.length)],
    ["Converged / failed", `${successCount} / ${failedCount}`],
    ["Current duty", `${formatNumber(result.heat_duty, 1)} kW`],
    ["Stored runs", userEmail ? String(stored.runs.length) : "Sign in"],
    ["Open alerts", userEmail ? String(open) : "Sign in"],
  ];
  return (
    <div className="space-y-4 p-4 text-[12px]">
      <div className="grid grid-cols-5 gap-3">
        {tiles.map(([label, value]) => (
          <div key={label} className="border border-[#e1e1e1] px-3 py-2"><div className="text-[11px] text-[#555]">{label}</div><div className="text-[20px] font-semibold">{value}</div></div>
        ))}
      </div>
      <div className="h-[320px] border border-[#e1e1e1] p-2">
        <p className="mb-1 font-semibold">Hot outlet temperature: plant vs physics vs ML (case {selectedRow.timestamp})</p>
        <ResponsiveContainer width="100%" height="90%">
          <LineChart data={trend}>
            <CartesianGrid stroke="#eee" /><XAxis dataKey="t" /><YAxis domain={["auto", "auto"]} /><Tooltip />
            <Line dataKey="actual" name="Plant" stroke="#222" dot={false} />
            <Line dataKey="physics" name="Physics (mock)" stroke="#d42727" dot={false} />
            <Line dataKey="ml" name="ML (demo)" stroke="#1f5fd0" strokeDasharray="4 3" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap gap-2">
        {[["/", "Open workbench"], ["/dynamics", "Dynamic step test"], ["/optimization", "Optimize operation"], ["/reports", "Export report"], ["/map", "Feature map"]].map(([href, label]) => (
          <Link key={href} href={href} className="border border-[#1f4e79] px-3 py-1 font-semibold text-[#1f4e79] hover:bg-[#e7f1fb]">{label}</Link>
        ))}
      </div>
    </div>
  );
}
