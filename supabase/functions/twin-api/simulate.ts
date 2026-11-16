import { selectEngine } from "../_shared/engine.ts";
import { json, requireUserId, toTimestamptz, userClient } from "../_shared/http.ts";
import { toSimulationInput } from "../_shared/mockHeatExchanger.ts";
import type { EquipmentSpecs, PlantRow } from "../_shared/types.ts";

const ROW_FIELDS = [
  "hot_flow", "hot_temperature", "hot_pressure", "cooling_flow", "cooling_temperature",
  "cooling_pressure", "composition", "hot_outlet_spec",
] as const;
const EQUIPMENT_FIELDS = ["u", "area", "heatDutySpec", "pressureDropHot", "pressureDropCold"] as const;
const CALC_TYPES = ["Specify Outlet Temperature", "Specify Heat Duty", "Specify Area"];
const num = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/**
 * Creates a run (queued -> running -> converged/failed) so subscribers see live status,
 * solves it with the active engine, and stores the result. ML scoring is a separate function.
 */
export async function handler(req: Request): Promise<Response> {
  const { db, error } = userClient(req);
  if (error) return error;
  const userId = await requireUserId(db);
  if (!userId) return json({ error: "Not signed in." }, 401);

  let body: { datasetId?: unknown; row?: Record<string, unknown>; equipment?: Record<string, unknown>; mode?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Body must be JSON." }, 400);
  }
  const { row, equipment } = body;
  if (!row || typeof row.timestamp !== "string" || !equipment) {
    return json({ error: "`row` and `equipment` are required." }, 400);
  }
  const recordedAt = toTimestamptz(row.timestamp);
  if (!recordedAt) return json({ error: "Unreadable row timestamp." }, 422);
  if (!ROW_FIELDS.every((f) => num(row[f])) || !EQUIPMENT_FIELDS.every((f) => num(equipment[f]))) {
    return json({ error: "Row or equipment has a missing or non-numeric field." }, 422);
  }
  if (typeof equipment.calculationType !== "string" || !CALC_TYPES.includes(equipment.calculationType)) {
    return json({ error: "Unknown calculationType." }, 422);
  }

  const datasetId = typeof body.datasetId === "string" ? body.datasetId : null;
  let plantDataId: string | null = null;
  if (datasetId) {
    const { data } = await db.from("plant_data").select("id").eq("dataset_id", datasetId).eq("recorded_at", recordedAt).maybeSingle();
    plantDataId = data?.id ?? null;
  }

  const engine = selectEngine();
  const { data: run, error: runError } = await db
    .from("simulation_runs")
    .insert({
      owner_id: userId,
      dataset_id: datasetId,
      plant_data_id: plantDataId,
      recorded_at: recordedAt,
      mode: body.mode === "twin" ? "twin" : "simulation",
      engine: engine.name,
      status: "running",
      equipment,
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (runError) return json({ error: runError.message }, 500);

  try {
    const input = toSimulationInput({ ...row, id: `plant-${row.timestamp}` } as unknown as PlantRow, equipment as unknown as EquipmentSpecs);
    const output = await engine.solve(input);
    const failed = output.status === "Failed";

    if (!failed) {
      const { error: resultError } = await db.from("simulation_results").insert({
        owner_id: userId,
        run_id: run.id,
        hot_outlet_temperature: output.hot_outlet_temperature,
        cold_outlet_temperature: output.cold_outlet_temperature,
        hot_outlet_pressure: output.hot_outlet_pressure,
        cold_outlet_pressure: output.cold_outlet_pressure,
        heat_duty: output.heat_duty,
        lmtd: output.lmtd,
        reynolds_hot: output.reynolds_hot,
        reynolds_cold: output.reynolds_cold,
        pressure_drop_hot: output.pressure_drop_hot,
        pressure_drop_cold: output.pressure_drop_cold,
        raw: output,
      });
      if (resultError) throw new Error(resultError.message);
    }
    await db.from("simulation_runs").update({
      status: failed ? "failed" : "converged",
      error_message: failed ? output.error_message : null,
      finished_at: new Date().toISOString(),
    }).eq("id", run.id);

    return json({ runId: run.id, engine: engine.name, output });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Solver error.";
    await db.from("simulation_runs").update({ status: "failed", error_message: message, finished_at: new Date().toISOString() }).eq("id", run.id);
    return json({ runId: run.id, error: message }, 502);
  }
}
