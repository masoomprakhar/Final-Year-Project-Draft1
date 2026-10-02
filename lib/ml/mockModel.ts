import { round } from "@/lib/format";
import { dutyFromTemperatures } from "@/lib/simulation/mockHeatExchanger";
import type {
  AnomalyRow,
  AnomalyStatus,
  MlPrediction,
  PlantRow,
  SimulationOutput,
} from "@/lib/types";

export const DEMO_METRICS = {
  label: "DEMO / TRAINING DATA",
  note: "Demo model fitted on the bundled sample. It does not replace the mock physics results.",
  targets: [
    { name: "Hot outlet temperature", unit: "°C", mae: 0.18, rmse: 0.27, r2: 0.962 },
    { name: "Cold outlet temperature", unit: "°C", mae: 0.14, rmse: 0.21, r2: 0.971 },
    { name: "Heat duty", unit: "kW", mae: 1.6, rmse: 2.3, r2: 0.948 },
  ],
  featureImportance: [
    { feature: "hot_temperature", label: "Hot temperature", importance: 0.31 },
    { feature: "cooling_temperature", label: "Cooling temperature", importance: 0.22 },
    { feature: "hot_flow", label: "Hot flow", importance: 0.16 },
    { feature: "cooling_flow", label: "Cooling flow", importance: 0.14 },
    { feature: "hot_pressure", label: "Hot pressure", importance: 0.09 },
    { feature: "cooling_pressure", label: "Cooling pressure", importance: 0.08 },
  ],
};

export function predict(row: PlantRow, expected: SimulationOutput): MlPrediction {
  const hotBias =
    (row.hot_temperature - 35.2) * 0.05 +
    (row.hot_flow - 40) * 0.02 -
    (row.cooling_flow - 850) / 2000;
  const coldBias =
    (row.cooling_temperature - 31.2) * 0.04 +
    (row.cooling_flow - 850) / 4000;

  return {
    hot_outlet_temperature: round(expected.hot_outlet_temperature + 0.12 + hotBias, 1),
    cold_outlet_temperature: round(expected.cold_outlet_temperature - 0.08 + coldBias, 1),
    heat_duty: round(expected.heat_duty * 0.994 + 0.4 + hotBias, 1),
  };
}

export function predictFromOutput(row: PlantRow, output: SimulationOutput): MlPrediction {
  if (output.status !== "Converged") {
    return {
      hot_outlet_temperature: Number.NaN,
      cold_outlet_temperature: Number.NaN,
      heat_duty: Number.NaN,
    };
  }
  return predict(row, output);
}

function classify(absDeviation: number, warn: number, alarm: number): AnomalyStatus {
  if (absDeviation >= alarm) return "ANOMALY";
  if (absDeviation >= warn) return "WARNING";
  return "NORMAL";
}

const RANK: Record<AnomalyStatus, number> = {
  NORMAL: 0,
  WARNING: 1,
  ANOMALY: 2,
};

export function worstStatus(rows: AnomalyRow[]): AnomalyStatus {
  return rows.reduce<AnomalyStatus>((worst, row) => {
    return RANK[row.status] > RANK[worst] ? row.status : worst;
  }, "NORMAL");
}

export function buildAnomalies(
  rows: PlantRow[],
  results: Record<string, SimulationOutput>,
  predictions: Record<string, MlPrediction>,
): AnomalyRow[] {
  const anomalies: AnomalyRow[] = [];

  for (const row of rows) {
    const expected = results[row.id];
    const ml = predictions[row.id];
    if (!expected || expected.status !== "Converged" || !ml) continue;

    const actualDuty = dutyFromTemperatures(
      row.hot_flow,
      row.hot_temperature,
      row.hot_outlet_actual,
    );

    const items = [
      {
        variable: "Hot outlet temperature",
        unit: "°C",
        digits: 2,
        actual: row.hot_outlet_actual,
        expected: expected.hot_outlet_temperature,
        ml: ml.hot_outlet_temperature,
        warn: 0.35,
        alarm: 0.8,
      },
      {
        variable: "Cold outlet temperature",
        unit: "°C",
        digits: 2,
        actual: row.cold_outlet_actual,
        expected: expected.cold_outlet_temperature,
        ml: ml.cold_outlet_temperature,
        warn: 0.35,
        alarm: 0.8,
      },
      {
        variable: "Heat duty",
        unit: "kW",
        digits: 1,
        actual: actualDuty,
        expected: expected.heat_duty,
        ml: ml.heat_duty,
        warn: 4,
        alarm: 8,
      },
    ];

    for (const item of items) {
      const deviation = round(item.actual - item.expected, item.digits);
      anomalies.push({
        timestamp: row.timestamp,
        variable: item.variable,
        unit: item.unit,
        actual: item.actual,
        expected: item.expected,
        deviation,
        mlPrediction: item.ml,
        status: classify(Math.abs(deviation), item.warn, item.alarm),
      });
    }
  }

  return anomalies;
}
