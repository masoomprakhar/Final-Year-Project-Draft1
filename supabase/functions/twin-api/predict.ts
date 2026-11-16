import { json, requireUserId, toTimestamptz, userClient } from "../_shared/http.ts";
import { buildAnomalies, predictFromOutput } from "../_shared/mockModel.ts";
import type { PlantRow, SimulationOutput } from "../_shared/types.ts";

const ROW_FIELDS = [
  "hot_flow", "hot_temperature", "hot_pressure", "cooling_flow", "cooling_temperature", "cooling_pressure",
  "composition", "hot_outlet_spec", "hot_outlet_actual", "cold_outlet_actual",
  "hot_outlet_pressure_actual", "cold_outlet_pressure_actual",
] as const;
const num = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/**
 * Scores a finished run with the demo ML model, stores the prediction, and raises alerts for
 * WARNING / ANOMALY deviations. Reads the solver output the simulate function already stored.
 */
export async function handler(req: Request): Promise<Response> {
  const { db, error } = userClient(req);
  if (error) return error;
  const userId = await requireUserId(db);
  if (!userId) return json({ error: "Not signed in." }, 401);

  let body: { runId?: unknown; row?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Body must be JSON." }, 400);
  }
  const { row } = body;
  if (typeof body.runId !== "string" || !row || typeof row.timestamp !== "string") {
    return json({ error: "`runId` and `row` are required." }, 400);
  }
  if (!ROW_FIELDS.every((f) => num(row[f]))) return json({ error: "Row has a missing or non-numeric field." }, 422);

  const { data: run } = await db.from("simulation_runs").select("id,dataset_id,status,recorded_at").eq("id", body.runId).maybeSingle();
  if (!run) return json({ error: "Run not found." }, 404);
  if (run.status !== "converged") return json({ error: "Run has not converged; nothing to score." }, 409);
  const { data: result } = await db.from("simulation_results").select("raw").eq("run_id", run.id).maybeSingle();
  if (!result?.raw) return json({ error: "Run has no stored result." }, 409);

  const plantRow = { ...row, id: `plant-${row.timestamp}` } as unknown as PlantRow;
  const output = result.raw as SimulationOutput;
  // Swap point: set ML_API_URL (an https endpoint that takes {row, expected} and returns the three
  // predicted values) to score with a real model. Any failure falls back to the demo model.
  let prediction = predictFromOutput(plantRow, output);
  let modelName = "demo-mock-model";
  const mlUrl = Deno.env.get("ML_API_URL");
  if (mlUrl) {
    try {
      const res = await fetch(mlUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ row: plantRow, expected: output }),
        signal: AbortSignal.timeout(8000),
      });
      const body = await res.json();
      if (res.ok && [body.hot_outlet_temperature, body.cold_outlet_temperature, body.heat_duty].every(num)) {
        prediction = body;
        modelName = Deno.env.get("ML_MODEL_NAME") ?? "external-model";
      }
    } catch {
      /* keep the demo prediction */
    }
  }
  const anomalies = buildAnomalies([plantRow], { [plantRow.id]: output }, { [plantRow.id]: prediction });
  const flagged = anomalies.filter((a) => a.status !== "NORMAL");
  const recordedAt = toTimestamptz(row.timestamp) ?? run.recorded_at;

  const { error: predError } = await db.from("ml_predictions").upsert(
    {
      owner_id: userId,
      run_id: run.id,
      model_name: modelName,
      is_demo: modelName === "demo-mock-model",
      hot_outlet_temperature: prediction.hot_outlet_temperature,
      cold_outlet_temperature: prediction.cold_outlet_temperature,
      heat_duty: prediction.heat_duty,
    },
    { onConflict: "run_id" },
  );
  if (predError) return json({ error: predError.message }, 500);

  if (flagged.length > 0) {
    const { error: alertError } = await db.from("alerts").insert(
      flagged.map((a) => ({
        owner_id: userId,
        run_id: run.id,
        dataset_id: run.dataset_id,
        recorded_at: recordedAt,
        variable: a.variable,
        unit: a.unit,
        actual: a.actual,
        expected: a.expected,
        ml_prediction: a.mlPrediction,
        deviation: a.deviation,
        severity: a.status,
      })),
    );
    if (alertError) return json({ error: alertError.message }, 500);
  }

  return json({ runId: run.id, prediction, anomalies, alertsRaised: flagged.length });
}
