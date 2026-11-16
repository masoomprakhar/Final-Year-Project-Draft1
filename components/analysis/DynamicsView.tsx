"use client";

import { useMemo, useState } from "react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { simulateStep, type DynamicsConfig, type StepVariable } from "@/lib/dynamics";

const VARIABLES: { id: StepVariable; label: string }[] = [
  { id: "hot_flow", label: "Hot flow (S1)" },
  { id: "hot_temperature", label: "Hot inlet temperature" },
  { id: "cooling_flow", label: "Cooling water flow (S3)" },
  { id: "cooling_temperature", label: "Cooling water temperature" },
];

export function DynamicsView() {
  const [cfg, setCfg] = useState<DynamicsConfig>({ variable: "cooling_flow", changePercent: -15, stepAtMin: 10, durationMin: 60, tauMin: 8 });
  const { points, error } = useMemo(() => {
    try {
      return { points: simulateStep(cfg), error: null };
    } catch (e) {
      return { points: [], error: e instanceof Error ? e.message : "Could not simulate." };
    }
  }, [cfg]);
  const num = (key: keyof DynamicsConfig) => (
    <input type="number" value={cfg[key] as number} onChange={(e) => setCfg({ ...cfg, [key]: Number(e.target.value) })}
      className="h-7 w-full border border-[#c5c5c5] px-2" />
  );
  return (
    <div className="grid grid-cols-[260px_minmax(0,1fr)] gap-4 p-4 text-[12px]">
      <div className="space-y-2">
        <p className="rounded border border-[#e8c46c] bg-[#fff8e5] p-2">MOCK: a first-order response between two mock steady states. Not a dynamic process model.</p>
        <label className="block">Step variable
          <select value={cfg.variable} onChange={(e) => setCfg({ ...cfg, variable: e.target.value as StepVariable })} className="mt-0.5 h-7 w-full border border-[#c5c5c5] px-1">
            {VARIABLES.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
          </select>
        </label>
        <label className="block">Change (%){num("changePercent")}</label>
        <label className="block">Step at (min){num("stepAtMin")}</label>
        <label className="block">Duration (min){num("durationMin")}</label>
        <label className="block">Time constant τ (min){num("tauMin")}</label>
        {error && <p className="text-[#b42318]">{error}</p>}
      </div>
      <div className="h-[420px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points}>
            <CartesianGrid stroke="#eee" />
            <XAxis dataKey="t" label={{ value: "Time (min)", position: "insideBottom", offset: -2 }} />
            <YAxis yAxisId="t" domain={["auto", "auto"]} label={{ value: "°C", angle: -90, position: "insideLeft" }} />
            <YAxis yAxisId="d" orientation="right" domain={["auto", "auto"]} label={{ value: "kW", angle: 90, position: "insideRight" }} />
            <Tooltip />
            <Legend />
            <Line yAxisId="t" type="monotone" dataKey="hot" name="Hot outlet (°C)" stroke="#d42727" dot={false} />
            <Line yAxisId="t" type="monotone" dataKey="cold" name="Cold outlet (°C)" stroke="#1f5fd0" dot={false} />
            <Line yAxisId="d" type="monotone" dataKey="duty" name="Duty (kW)" stroke="#555" strokeDasharray="4 3" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
