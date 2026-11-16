import { round } from "@/lib/format";
import { BASE_INPUT } from "@/lib/dynamics";
import { runMock } from "@/lib/simulation/mockHeatExchanger";

export type OptimizationConfig = {
  maxColdOutlet: number;
  maxHotOutlet: number;
  pumpCostPerUnit: number;
  chillerCostPerKw: number;
};
export type OptimizationPoint = {
  coolingFlow: number; hotSpec: number; duty: number; hotOut: number; coldOut: number; cost: number; feasible: boolean;
};

/** Grid search: cost = pumping (grows with flow cubed) + a chiller penalty for every kW of cooling below target. */
export function optimize(config: OptimizationConfig) {
  const grid: OptimizationPoint[] = [];
  for (let flow = 400; flow <= 1200; flow += 40) {
    for (let spec = 24; spec <= 33; spec += 0.5) {
      const out = runMock({ ...BASE_INPUT, cooling_flow: flow, hot_outlet_temperature_spec: spec, calculation_type: "Specify Outlet Temperature" });
      if (out.status === "Failed") continue;
      const pumping = config.pumpCostPerUnit * (flow / 850) ** 3;
      const chiller = config.chillerCostPerKw * Math.max(0, out.heat_duty - 100) * 0.05;
      const feasible = out.cold_outlet_temperature <= config.maxColdOutlet && out.hot_outlet_temperature <= config.maxHotOutlet;
      grid.push({
        coolingFlow: flow, hotSpec: spec, duty: out.heat_duty, hotOut: out.hot_outlet_temperature,
        coldOut: out.cold_outlet_temperature, cost: round(pumping + chiller, 2), feasible,
      });
    }
  }
  const feasible = grid.filter((p) => p.feasible);
  const best = feasible.length ? feasible.reduce((a, b) => (b.cost < a.cost ? b : a)) : null;
  return { grid, best, feasibleCount: feasible.length };
}
