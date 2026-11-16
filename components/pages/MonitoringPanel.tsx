"use client";

import { AlertsPanel } from "@/components/bottom/AlertsPanel";
import { StoredNotice } from "@/components/bottom/StoredNotice";
import { useTwin } from "@/lib/store/TwinProvider";

export function MonitoringPanel() {
  const { stored, backendEnabled, userEmail } = useTwin();
  if (!backendEnabled || !userEmail) return <StoredNotice />;
  const open = stored.alerts.filter((a) => !a.acknowledged);
  const anomalies = open.filter((a) => a.severity === "ANOMALY").length;
  const converged = stored.runs.filter((r) => r.status === "converged").length;
  const failed = stored.runs.filter((r) => r.status === "failed").length;
  const tiles = [
    ["Stored runs", stored.runs.length], ["Converged", converged], ["Failed", failed],
    ["Open alerts", open.length], ["Open anomalies", anomalies],
  ] as const;
  return (
    <div className="flex h-full flex-col">
      <div className="grid shrink-0 grid-cols-5 gap-2 border-b border-[#e5e5e5] p-3">
        {tiles.map(([label, value]) => (
          <div key={label} className="border border-[#e1e1e1] px-3 py-2">
            <div className="text-[11px] text-[#555]">{label}</div>
            <div className={`text-[20px] font-semibold ${label === "Open anomalies" && value > 0 ? "text-[#b42318]" : ""}`}>{value}</div>
          </div>
        ))}
      </div>
      <div className="min-h-0 flex-1"><AlertsPanel /></div>
    </div>
  );
}
