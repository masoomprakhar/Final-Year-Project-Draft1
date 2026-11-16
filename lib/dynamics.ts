import { round } from "@/lib/format";
import { REFERENCE, runMock, type SimulationInput } from "@/lib/simulation/mockHeatExchanger";

export type StepVariable = "hot_flow" | "hot_temperature" | "cooling_flow" | "cooling_temperature";
export type DynamicsConfig = {
  variable: StepVariable;
  changePercent: number;
  stepAtMin: number;
  durationMin: number;
  /** First-order time constant of the exchanger, minutes. */
  tauMin: number;
};
export type DynamicPoint = { t: number; hot: number; cold: number; duty: number; input: number };

export const BASE_INPUT: SimulationInput = {
  hot_flow: REFERENCE.hotFlow, hot_temperature: REFERENCE.hotTemperature, hot_pressure: REFERENCE.hotPressure,
  cooling_flow: REFERENCE.coolingFlow, cooling_temperature: REFERENCE.coolingTemperature,
  cooling_pressure: REFERENCE.coolingPressure, composition: 1,
  hot_outlet_temperature_spec: REFERENCE.hotOutletTemperature,
  pressure_drop_hot_spec: REFERENCE.pressureDropHotSpec, pressure_drop_cold_spec: REFERENCE.pressureDropColdSpec,
  calculation_type: "Specify Heat Duty", heat_duty_spec: REFERENCE.heatDuty, u: REFERENCE.u, area: REFERENCE.area,
};

/** Mock transient: the outlets relax exponentially to the new mock steady state after the step. */
export function simulateStep(config: DynamicsConfig): DynamicPoint[] {
  const after = { ...BASE_INPUT, [config.variable]: BASE_INPUT[config.variable] * (1 + config.changePercent / 100) };
  const before = runMock(BASE_INPUT);
  const target = runMock(after);
  if (target.status === "Failed") throw new Error(target.error_message);
  const points: DynamicPoint[] = [];
  const steps = 120;
  for (let i = 0; i <= steps; i += 1) {
    const t = (config.durationMin * i) / steps;
    const k = t < config.stepAtMin ? 0 : 1 - Math.exp(-(t - config.stepAtMin) / Math.max(config.tauMin, 0.1));
    points.push({
      t: round(t, 2),
      hot: round(before.hot_outlet_temperature + (target.hot_outlet_temperature - before.hot_outlet_temperature) * k, 2),
      cold: round(before.cold_outlet_temperature + (target.cold_outlet_temperature - before.cold_outlet_temperature) * k, 2),
      duty: round(before.heat_duty + (target.heat_duty - before.heat_duty) * k, 1),
      input: t < config.stepAtMin ? BASE_INPUT[config.variable] : after[config.variable],
    });
  }
  return points;
}
