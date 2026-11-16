"use client";

import { StoredNotice } from "@/components/bottom/StoredNotice";
import { formatNumber, formatStamp } from "@/lib/format";
import { useTwin } from "@/lib/store/TwinProvider";

const one = <T,>(value: T | T[] | null | undefined): T | null =>
  Array.isArray(value) ? (value[0] ?? null) : (value ?? null);

const STATUS_COLOR: Record<string, string> = {
  converged: "text-[#0f7a32]",
  failed: "text-[#b42318]",
  running: "text-[#1f4e79]",
  queued: "text-[#555]",
  stopped: "text-[#8a5a00]",
};

export function RunsPanel() {
  const { stored, userEmail, backendEnabled, activeDatasetId, generateDemoRuns } = useTwin();

  if (!backendEnabled || !userEmail) return <StoredNotice />;

  const alertsByRun = new Map<string, number>();
  for (const alert of stored.alerts) {
    if (alert.run_id) alertsByRun.set(alert.run_id, (alertsByRun.get(alert.run_id) ?? 0) + 1);
  }

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex h-8 shrink-0 items-center justify-between border-b border-[#e5e5e5] px-2 text-[12px]">
        <span className="text-[#444]">
          {stored.runs.length} stored run{stored.runs.length === 1 ? "" : "s"}. ML columns are demo values.
        </span>
        <button
          type="button"
          disabled={!activeDatasetId}
          onClick={() => void generateDemoRuns()}
          title="Fills the open dataset with demo runs, ML predictions and alerts"
          className="h-6 border border-[#1f4e79] px-2 font-semibold text-[#1f4e79] hover:bg-[#e7f1fb] disabled:opacity-40"
        >
          Generate demo runs &amp; alerts
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        {stored.runs.length === 0 ? (
          <div className="grid h-full place-items-center text-[12px] text-[#444]">
            {stored.loading ? "Loading runs…" : "No runs yet. Run Simulation, or generate demo runs."}
          </div>
        ) : (
          <table className="w-full min-w-[820px] border-collapse text-[12px]">
            <thead className="sticky top-0 bg-[#f7f7f7]">
              <tr>
                {["Plant time", "Mode", "Engine", "Status", "Hot out (°C)", "Cold out (°C)", "Duty (kW)", "ML duty (kW, demo)", "Alerts", "Saved"].map((label) => (
                  <th key={label} className="whitespace-nowrap border border-[#e1e1e1] px-2 py-0.5 text-left font-semibold">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stored.runs.map((run) => {
                const result = one(run.simulation_results);
                const ml = one(run.ml_predictions);
                const alerts = alertsByRun.get(run.id) ?? 0;
                return (
                  <tr key={run.id}>
                    <td className="whitespace-nowrap border border-[#eee] px-2 py-0.5">{formatStamp(run.recorded_at)}</td>
                    <td className="border border-[#eee] px-2 py-0.5">{run.mode}</td>
                    <td className="border border-[#eee] px-2 py-0.5">{run.engine}</td>
                    <td
                      className={`border border-[#eee] px-2 py-0.5 font-semibold ${STATUS_COLOR[run.status] ?? ""}`}
                      title={run.error_message ?? undefined}
                    >
                      {run.status}
                    </td>
                    <td className="border border-[#eee] px-2 py-0.5 text-right">{result ? formatNumber(result.hot_outlet_temperature, 1) : "—"}</td>
                    <td className="border border-[#eee] px-2 py-0.5 text-right">{result ? formatNumber(result.cold_outlet_temperature, 1) : "—"}</td>
                    <td className="border border-[#eee] px-2 py-0.5 text-right">{result ? formatNumber(result.heat_duty, 1) : "—"}</td>
                    <td className="border border-[#eee] px-2 py-0.5 text-right">{ml?.heat_duty != null ? formatNumber(ml.heat_duty, 1) : "—"}</td>
                    <td className={`border border-[#eee] px-2 py-0.5 text-right ${alerts ? "font-semibold text-[#8a5a00]" : ""}`}>{alerts || "—"}</td>
                    <td className="whitespace-nowrap border border-[#eee] px-2 py-0.5">{formatStamp(run.created_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
