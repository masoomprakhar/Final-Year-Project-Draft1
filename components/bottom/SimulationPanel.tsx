"use client";

import { StatusPill } from "@/components/StatusPill";
import { formatNumber, formatSigned } from "@/lib/format";
import { DEMO_METRICS } from "@/lib/ml/mockModel";
import { dutyFromTemperatures } from "@/lib/simulation/mockHeatExchanger";
import { useTwin } from "@/lib/store/TwinProvider";

export function SimulationPanel() {
  const twin = useTwin();
  const actualDuty = dutyFromTemperatures(
    twin.selectedRow.hot_flow,
    twin.selectedRow.hot_temperature,
    twin.selectedRow.hot_outlet_actual,
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="grid shrink-0 grid-cols-5 gap-2 border-b border-[#e5e5e5] p-2">
        <Stat label="Simulation status" value={<StatusPill status={twin.status} />} />
        <Stat label="Last timestamp" value={twin.selectedRow.timestamp} />
        <Stat label="Records" value={String(twin.rows.length)} />
        <Stat label="Successful simulations" value={String(twin.successCount)} />
        <Stat label="Failed simulations" value={String(twin.failedCount)} />
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-[#e5e5e5] px-2 py-1.5">
        <label className="text-[12px] text-[#444]" htmlFor="timestamp-select">
          Timestamp
        </label>
        <select
          id="timestamp-select"
          value={twin.selectedRow.id}
          onChange={(event) => twin.selectRow(event.target.value)}
          className="h-7 min-w-[180px] border border-[#c5c5c5] bg-white px-1 text-[12px]"
        >
          {twin.rows.map((row) => (
            <option key={row.id} value={row.id}>
              {row.timestamp}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={twin.runDigitalTwin}
          className="h-7 bg-[#1f4e79] px-3 text-[12px] font-semibold text-white hover:bg-[#183e61]"
        >
          Run Digital Twin
        </button>
        <span className="text-[11px] text-[#6b7280]">
          Hot {formatNumber(twin.selectedRow.hot_temperature, 1)} → {formatNumber(twin.result.hot_outlet_temperature, 1)} °C
          {" · "}
          Cold {formatNumber(twin.selectedRow.cooling_temperature, 1)} → {formatNumber(twin.result.cold_outlet_temperature, 1)} °C
          {" · "}
          {formatNumber(twin.result.heat_duty, 1)} kW
          {" · "}
          Plant duty {formatNumber(actualDuty, 1)} kW
        </span>
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1.45fr)_300px]">
        <div className="min-h-0 overflow-auto">
          <table className="w-full min-w-[720px] border-collapse text-[12px]">
            <thead className="sticky top-0 bg-[#f7f7f7]">
              <tr>
                {["Timestamp", "Variable", "Actual", "Expected", "Deviation", "ML Prediction", "Status"].map(
                  (heading) => (
                    <th key={heading} className="border border-[#e1e1e1] px-2 py-1 text-left font-semibold">
                      {heading}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {twin.anomalies.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-2 py-4 text-[#666]">
                    No anomaly rows yet. Load plant data and run the digital twin.
                  </td>
                </tr>
              ) : (
                twin.anomalies.map((row) => (
                  <tr
                    key={`${row.timestamp}-${row.variable}`}
                    className={row.timestamp === twin.selectedRow.timestamp ? "bg-[#f3f8fd]" : ""}
                  >
                    <td className="border border-[#eee] px-2 py-1">{row.timestamp}</td>
                    <td className="border border-[#eee] px-2 py-1">{row.variable}</td>
                    <td className="border border-[#eee] px-2 py-1 text-right">
                      {formatNumber(row.actual, row.unit === "kW" ? 1 : 1)} {row.unit}
                    </td>
                    <td className="border border-[#eee] px-2 py-1 text-right">
                      {formatNumber(row.expected, 1)} {row.unit}
                    </td>
                    <td className="border border-[#eee] px-2 py-1 text-right">
                      {formatSigned(row.deviation, row.unit === "kW" ? 1 : 2)}
                    </td>
                    <td className="border border-[#eee] px-2 py-1 text-right">
                      {formatNumber(row.mlPrediction, 1)} {row.unit}
                    </td>
                    <td className="border border-[#eee] px-2 py-1">
                      <StatusPill status={row.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <aside id="ml-analytics" className="min-h-0 overflow-auto border-l border-[#e5e5e5] p-2">
          <div className="mb-1 text-[12px] font-semibold text-[#1f4e79]">ML Analytics</div>
          <div className="mb-2 inline-block bg-[#fff4d6] px-1.5 py-0.5 text-[10px] font-semibold text-[#8a5a00]">
            {DEMO_METRICS.label}
          </div>
          <p className="mb-2 text-[11px] leading-snug text-[#555]">{DEMO_METRICS.note}</p>
          <table className="mb-3 w-full text-[11px]">
            <thead>
              <tr className="text-left text-[#666]">
                <th className="py-0.5 font-medium">Target</th>
                <th className="py-0.5 text-right font-medium">MAE</th>
                <th className="py-0.5 text-right font-medium">RMSE</th>
                <th className="py-0.5 text-right font-medium">R²</th>
              </tr>
            </thead>
            <tbody>
              {DEMO_METRICS.targets.map((target) => (
                <tr key={target.name} className="border-t border-[#eee]">
                  <td className="py-1 pr-1">{target.name}</td>
                  <td className="py-1 text-right">{target.mae.toFixed(2)}</td>
                  <td className="py-1 text-right">{target.rmse.toFixed(2)}</td>
                  <td className="py-1 text-right">{target.r2.toFixed(3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mb-1 text-[12px] font-semibold">Feature importance</div>
          <div className="space-y-1">
            {DEMO_METRICS.featureImportance.map((feature) => (
              <div key={feature.feature} className="grid grid-cols-[108px_1fr_32px] items-center gap-1 text-[11px]">
                <span>{feature.label}</span>
                <div className="h-2 bg-[#eef2f6]">
                  <div className="h-2 bg-[#1f4e79]" style={{ width: `${feature.importance * 100}%` }} />
                </div>
                <span className="text-right">{feature.importance.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="border border-[#d7d7d7] bg-[#fafafa] px-2 py-1.5">
      <div className="text-[10px] uppercase tracking-wide text-[#6b7280]">{label}</div>
      <div className="mt-0.5 text-[13px] font-semibold text-[#1f2933]">{value}</div>
    </div>
  );
}
