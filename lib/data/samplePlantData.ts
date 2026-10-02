import { round } from "@/lib/format";
import { REFERENCE, runMock } from "@/lib/simulation/mockHeatExchanger";
import type { PlantRow } from "@/lib/types";

export const BASE_ROW_INDEX = 12;

function inletSpec(hotTemperature: number, exact: boolean) {
  if (exact) return REFERENCE.hotOutletTemperature;
  let spec = round(REFERENCE.hotOutletTemperature + (hotTemperature - REFERENCE.hotTemperature) * 0.35, 1);
  if (spec >= hotTemperature) spec = round(hotTemperature - 0.5, 1);
  return spec;
}

export function createSampleRows(): PlantRow[] {
  const rows: PlantRow[] = [];

  for (let i = 0; i < 24; i += 1) {
    const exact = i === BASE_ROW_INDEX;
    const timestamp = `2026-04-12 ${String(i).padStart(2, "0")}:00`;
    const hot_flow = exact ? 40 : round(40 + Math.sin(i / 3) * 0.8, 2);
    const hot_temperature = exact ? 35.2 : round(35.2 + Math.sin(i / 2.2) * 0.45, 2);
    const hot_pressure = exact ? 2.1 : round(2.1 + Math.cos(i / 4) * 0.05, 2);
    const cooling_flow = exact ? 850 : round(850 + Math.cos(i / 3.5) * 12, 1);
    const cooling_temperature = exact ? 31.2 : round(31.2 + Math.sin(i / 2.8) * 0.25, 2);
    const cooling_pressure = exact ? 1.8 : round(1.8 + Math.sin(i / 5) * 0.04, 2);
    const hot_outlet_spec = inletSpec(hot_temperature, exact);

    let hotDelta = round(Math.sin(i * 1.7) * 0.12, 2);
    let coldDelta = round(Math.cos(i * 1.3) * 0.1, 2);
    if (i === 7) hotDelta = 1.45;
    if (i === 15) coldDelta = 0.62;
    if (i === 21) {
      hotDelta = 1.1;
      coldDelta = -0.95;
    }
    if (exact) {
      hotDelta = 0;
      coldDelta = 0;
    }

    const simulated = runMock({
      hot_flow,
      hot_temperature,
      hot_pressure,
      cooling_flow,
      cooling_temperature,
      cooling_pressure,
      composition: 1,
      hot_outlet_temperature_spec: hot_outlet_spec,
      pressure_drop_hot_spec: REFERENCE.pressureDropHotSpec,
      pressure_drop_cold_spec: REFERENCE.pressureDropColdSpec,
    });

    rows.push({
      id: `plant-${timestamp}`,
      timestamp,
      hot_flow,
      hot_temperature,
      hot_pressure,
      cooling_flow,
      cooling_temperature,
      cooling_pressure,
      composition: 1,
      hot_outlet_spec,
      hot_outlet_actual: round(simulated.hot_outlet_temperature + hotDelta, 1),
      cold_outlet_actual: round(simulated.cold_outlet_temperature + coldDelta, 1),
      hot_outlet_pressure_actual: simulated.hot_outlet_pressure,
      cold_outlet_pressure_actual: simulated.cold_outlet_pressure,
    });
  }

  return rows;
}

export const SAMPLE_ROWS = createSampleRows();
export const DEFAULT_ROW_ID = SAMPLE_ROWS[BASE_ROW_INDEX].id;
