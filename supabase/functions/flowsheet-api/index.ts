import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, json, requireUserId, userClient } from "../_shared/http.ts";
import { solveFlowsheet } from "../_shared/flowsheetSolver.ts";
import type { FlowStream, FlowUnit } from "../_shared/flowsheetTypes.ts";

/**
 * POST /functions/v1/flowsheet-api  { flowsheetId }
 * Loads the saved flowsheet as the caller (RLS applies), solves it, records a run and its
 * solution. The solver is the same module the browser uses (synced from lib/flowsheet).
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Use POST." }, 405);

  const { db, error } = userClient(req);
  if (error) return error;
  const userId = await requireUserId(db);
  if (!userId) return json({ error: "Not signed in." }, 401);

  let flowsheetId: unknown;
  try {
    ({ flowsheetId } = await req.json());
  } catch {
    return json({ error: "Body must be JSON." }, 400);
  }
  if (typeof flowsheetId !== "string") return json({ error: "`flowsheetId` is required." }, 400);

  const [sheet, unitRows, streamRows] = await Promise.all([
    db.from("flowsheets").select("id,name").eq("id", flowsheetId).maybeSingle(),
    db.from("flowsheet_units").select("*").eq("flowsheet_id", flowsheetId),
    db.from("flowsheet_streams").select("*").eq("flowsheet_id", flowsheetId),
  ]);
  if (!sheet.data) return json({ error: "Flowsheet not found." }, 404);
  if (unitRows.error || streamRows.error) return json({ error: (unitRows.error ?? streamRows.error)!.message }, 500);

  const units: FlowUnit[] = unitRows.data.map((u) => ({
    id: u.id, tag: u.tag, type: u.unit_type, x: u.x, y: u.y, specs: u.specs ?? {},
  }));
  const streams: FlowStream[] = streamRows.data.map((s) => ({
    id: s.id, tag: s.tag, fromUnitId: s.from_unit_id, fromPort: s.from_port,
    toUnitId: s.to_unit_id, toPort: s.to_port, flow: s.flow, temperature: s.temperature, pressure: s.pressure,
  }));
  if (units.length === 0) return json({ error: "The flowsheet has no units." }, 422);

  const now = new Date().toISOString();
  const { data: run, error: runError } = await db
    .from("simulation_runs")
    .insert({
      owner_id: userId, flowsheet_id: flowsheetId, scope: "flowsheet", mode: "simulation",
      engine: "mock", status: "running", equipment: {}, recorded_at: now, started_at: now,
    })
    .select("id")
    .single();
  if (runError) return json({ error: runError.message }, 500);

  const solution = solveFlowsheet(units, streams);
  const { error: resultError } = await db.from("simulation_results").insert({
    owner_id: userId, run_id: run.id, raw: solution,
  });
  await db.from("simulation_runs").update({
    status: solution.ok && !resultError ? "converged" : "failed",
    error_message: solution.ok ? (resultError?.message ?? null) : solution.errors.join(" "),
    finished_at: new Date().toISOString(),
  }).eq("id", run.id);

  return json({ runId: run.id, solution });
});
