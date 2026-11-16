"use client";

import { useState } from "react";
import { StoredNotice } from "@/components/bottom/StoredNotice";
import { formatNumber, formatSigned, formatStamp } from "@/lib/format";
import { useTwin } from "@/lib/store/TwinProvider";

export function AlertsPanel() {
  const { stored, userEmail, backendEnabled, acknowledgeAlerts } = useTwin();
  const [showAcknowledged, setShowAcknowledged] = useState(false);

  if (!backendEnabled || !userEmail) return <StoredNotice />;

  const open = stored.alerts.filter((alert) => !alert.acknowledged);
  const visible = showAcknowledged ? stored.alerts : open;

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex h-8 shrink-0 items-center justify-between border-b border-[#e5e5e5] px-2 text-[12px]">
        <span className="text-[#444]">
          {open.length} open alert{open.length === 1 ? "" : "s"}. ML values are demo predictions.
        </span>
        <span className="flex items-center gap-3">
          <label className="flex items-center gap-1 text-[#444]">
            <input
              type="checkbox"
              checked={showAcknowledged}
              onChange={(event) => setShowAcknowledged(event.target.checked)}
            />
            Show acknowledged
          </label>
          <button
            type="button"
            disabled={open.length === 0}
            onClick={() => void acknowledgeAlerts()}
            className="h-6 border border-[#1f4e79] px-2 font-semibold text-[#1f4e79] hover:bg-[#e7f1fb] disabled:opacity-40"
          >
            Acknowledge all
          </button>
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        {visible.length === 0 ? (
          <div className="grid h-full place-items-center text-[12px] text-[#444]">
            {stored.loading ? "Loading alerts…" : "No alerts. Run Digital Twin on a row with a deviation to raise one."}
          </div>
        ) : (
          <table className="w-full min-w-[780px] border-collapse text-[12px]">
            <thead className="sticky top-0 bg-[#f7f7f7]">
              <tr>
                {["Severity", "Variable", "Plant time", "Actual", "Expected", "Deviation", "ML (demo)", ""].map((label) => (
                  <th key={label} className="whitespace-nowrap border border-[#e1e1e1] px-2 py-0.5 text-left font-semibold">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((alert) => (
                <tr key={alert.id} className={alert.acknowledged ? "text-[#888]" : ""}>
                  <td
                    className={`border border-[#eee] px-2 py-0.5 font-semibold ${
                      alert.acknowledged ? "" : alert.severity === "ANOMALY" ? "text-[#b42318]" : "text-[#8a5a00]"
                    }`}
                  >
                    {alert.severity}
                  </td>
                  <td className="border border-[#eee] px-2 py-0.5">{alert.variable} ({alert.unit})</td>
                  <td className="whitespace-nowrap border border-[#eee] px-2 py-0.5">{formatStamp(alert.recorded_at)}</td>
                  <td className="border border-[#eee] px-2 py-0.5 text-right">{formatNumber(alert.actual, 2)}</td>
                  <td className="border border-[#eee] px-2 py-0.5 text-right">{formatNumber(alert.expected, 2)}</td>
                  <td className="border border-[#eee] px-2 py-0.5 text-right">{formatSigned(alert.deviation, 2)}</td>
                  <td className="border border-[#eee] px-2 py-0.5 text-right">
                    {alert.ml_prediction != null ? formatNumber(alert.ml_prediction, 2) : "—"}
                  </td>
                  <td className="border border-[#eee] px-2 py-0.5 text-right">
                    {alert.acknowledged ? (
                      "acknowledged"
                    ) : (
                      <button
                        type="button"
                        onClick={() => void acknowledgeAlerts([alert.id])}
                        className="text-[#1f4e79] underline"
                      >
                        Acknowledge
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
