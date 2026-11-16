"use client";

import { useMemo, useState } from "react";
import { CartesianGrid, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from "recharts";
import { optimize, type OptimizationConfig } from "@/lib/optimization";

export function OptimizationView() {
  const [cfg, setCfg] = useState<OptimizationConfig>({ maxColdOutlet: 35, maxHotOutlet: 30, pumpCostPerUnit: 10, chillerCostPerKw: 1 });
  const result = useMemo(() => optimize(cfg), [cfg]);
  const field = (key: keyof OptimizationConfig, label: string) => (
    <label className="block">{label}
      <input type="number" value={cfg[key]} onChange={(e) => setCfg({ ...cfg, [key]: Number(e.target.value) })} className="mt-0.5 h-7 w-full border border-[#c5c5c5] px-2" />
    </label>
  );
  const feasible = result.grid.filter((p) => p.feasible);
  const infeasible = result.grid.filter((p) => !p.feasible);
  return (
    <div className="grid grid-cols-[260px_minmax(0,1fr)] gap-4 p-4 text-[12px]">
      <div className="space-y-2">
        <p className="rounded border border-[#e8c46c] bg-[#fff8e5] p-2">MOCK: grid search over mock physics with an illustrative cost model.</p>
        {field("maxColdOutlet", "Max cold outlet (°C)")}
        {field("maxHotOutlet", "Max hot outlet (°C)")}
        {field("pumpCostPerUnit", "Pumping cost at 850 kg/h")}
        {field("chillerCostPerKw", "Cost per extra kW")}
        <div className="border border-[#e1e1e1] p-2">
          {result.best ? (
            <>
              <p className="font-semibold text-[#0f7a32]">Best feasible point</p>
              <p>Cooling flow {result.best.coolingFlow} kg/h</p>
              <p>Hot outlet spec {result.best.hotSpec} °C</p>
              <p>Duty {result.best.duty} kW · cold out {result.best.coldOut} °C</p>
              <p>Cost {result.best.cost}</p>
            </>
          ) : <p className="font-semibold text-[#b42318]">No feasible point. Relax the limits.</p>}
          <p className="mt-1 text-[#555]">{result.feasibleCount} of {result.grid.length} points feasible.</p>
        </div>
      </div>
      <div className="h-[440px]">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart>
            <CartesianGrid stroke="#eee" />
            <XAxis type="number" dataKey="coolingFlow" name="Cooling flow" unit=" kg/h" domain={["dataMin", "dataMax"]} />
            <YAxis type="number" dataKey="hotSpec" name="Hot outlet spec" unit=" °C" domain={["dataMin", "dataMax"]} />
            <ZAxis dataKey="cost" range={[30, 30]} name="Cost" />
            <Tooltip />
            <Scatter name="Infeasible" data={infeasible} fill="#d9d9d9" />
            <Scatter name="Feasible" data={feasible} fill="#1f5fd0" />
            {result.best && <Scatter name="Best" data={[result.best]} fill="#0f7a32" shape="star" />}
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
