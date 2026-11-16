import { predict as demoPredict } from "@/lib/ml/mockModel";
import type { MlPrediction, PlantRow, SimulationOutput } from "@/lib/types";

/**
 * A model is anything that turns a plant row (plus the physics result) into the three predicted
 * outputs. `demo` runs the bundled mock; `http` posts to your own service, so a trained model can
 * be dropped in without changing the app:
 *
 *   POST <endpoint_url>   { "row": PlantRow, "expected": SimulationOutput }
 *   200  { "hot_outlet_temperature": n, "cold_outlet_temperature": n, "heat_duty": n }
 */
export type ModelKind = "demo" | "http";

export type ModelRecord = {
  id: string;
  name: string;
  version: string;
  kind: ModelKind;
  endpoint_url: string | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
};

export const DEMO_MODEL_SEED = {
  name: "demo-mock-model",
  version: "0",
  kind: "demo" as const,
  description: "Bundled mock model. Replace it by registering your own HTTP model.",
};

const FIELDS = ["hot_outlet_temperature", "cold_outlet_temperature", "heat_duty"] as const;

export function parsePrediction(value: unknown): MlPrediction {
  if (!value || typeof value !== "object") throw new Error("Model response is not an object.");
  const record = value as Record<string, unknown>;
  for (const field of FIELDS) {
    if (typeof record[field] !== "number" || !Number.isFinite(record[field])) {
      throw new Error(`Model response is missing a numeric "${field}".`);
    }
  }
  return {
    hot_outlet_temperature: record.hot_outlet_temperature as number,
    cold_outlet_temperature: record.cold_outlet_temperature as number,
    heat_duty: record.heat_duty as number,
  };
}

export async function runModel(
  model: Pick<ModelRecord, "kind" | "endpoint_url">,
  row: PlantRow,
  expected: SimulationOutput,
  fetchImpl: typeof fetch = fetch,
  timeoutMs = 8000,
): Promise<MlPrediction> {
  if (model.kind === "demo") return demoPredict(row, expected);
  if (!model.endpoint_url?.startsWith("https://")) throw new Error("HTTP models need an https:// endpoint.");
  const response = await fetchImpl(model.endpoint_url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ row, expected }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) throw new Error(`Model endpoint answered ${response.status}.`);
  return parsePrediction(await response.json());
}
