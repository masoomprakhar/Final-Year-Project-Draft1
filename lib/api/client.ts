import type { User } from "@supabase/supabase-js";
import { getBrowserSupabase } from "@/lib/supabase/client";
import type {
  AnomalyRow,
  EquipmentSpecs,
  MessageLevel,
  MlPrediction,
  PlantRow,
  SimulationOutput,
} from "@/lib/types";

export type DatasetInfo = { id: string; name: string; source: string; row_count: number; created_at: string };
type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const ROW_FIELDS = [
  "hot_flow", "hot_temperature", "hot_pressure", "cooling_flow", "cooling_temperature",
  "cooling_pressure", "composition", "hot_outlet_spec", "hot_outlet_actual",
  "cold_outlet_actual", "hot_outlet_pressure_actual", "cold_outlet_pressure_actual",
] as const;

/** timestamptz from the database back to the app's "YYYY-MM-DD HH:mm" label. */
function toLabel(value: string) {
  return new Date(value).toISOString().slice(0, 16).replace("T", " ");
}

/** "2026-04-12 12:00" (or an ISO string) to an ISO timestamp, or null when unreadable. Clock times are kept as UTC. */
function toIso(value: string): string | null {
  const text = value.trim();
  const iso = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?$/.test(text)
    ? text.replace(" ", "T") + (text.length === 16 ? ":00" : "") + "Z"
    : text;
  const time = Date.parse(iso);
  return Number.isNaN(time) ? null : new Date(time).toISOString();
}

// ---- Auth -------------------------------------------------------------------------------------

export async function signIn(email: string, password: string): Promise<Result> {
  const { error } = await getBrowserSupabase().auth.signInWithPassword({ email, password });
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function signUp(email: string, password: string): Promise<Result<{ needsConfirmation: boolean }>> {
  const { data, error } = await getBrowserSupabase().auth.signUp({ email, password });
  if (error) return { ok: false, error: error.message };
  return { ok: true, needsConfirmation: !data.session };
}

export async function signOut() {
  await getBrowserSupabase().auth.signOut();
}

/** Calls back with the current user (or null) now and on every sign-in / sign-out. */
export function onUserChange(callback: (user: User | null) => void) {
  const { data } = getBrowserSupabase().auth.onAuthStateChange((_event, session) => {
    // Deferred: supabase-js must not be re-entered from inside its own auth callback.
    setTimeout(() => callback(session?.user ?? null), 0);
  });
  return () => data.subscription.unsubscribe();
}

// ---- Datasets (Postgres + Storage) --------------------------------------------------------------

/** The dataset with this id, or the newest one when no id is given, with all its plant rows. */
export async function fetchDataset(id?: string): Promise<{ dataset: DatasetInfo; rows: PlantRow[] } | null> {
  const db = getBrowserSupabase();
  const base = db.from("datasets").select("id,name,source,row_count,created_at");
  const { data: dataset } = await (id
    ? base.eq("id", id).maybeSingle()
    : base.order("created_at", { ascending: false }).limit(1).maybeSingle());
  if (!dataset) return null;

  const { data: rows, error } = await db
    .from("plant_data")
    .select(`recorded_at,${ROW_FIELDS.join(",")}`)
    .eq("dataset_id", dataset.id)
    .order("recorded_at", { ascending: true })
    .limit(5000);
  if (error || !rows) return null;

  return {
    dataset,
    rows: (rows as unknown as Record<string, number | string>[]).map((row) => {
      const timestamp = toLabel(String(row.recorded_at));
      const out = { id: `plant-${timestamp}`, timestamp } as PlantRow;
      for (const field of ROW_FIELDS) out[field] = Number(row[field]);
      return out;
    }),
  };
}

export const fetchLatestDataset = () => fetchDataset();

export async function listDatasets(): Promise<DatasetInfo[]> {
  const { data } = await getBrowserSupabase()
    .from("datasets")
    .select("id,name,source,row_count,created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  return (data as DatasetInfo[]) ?? [];
}

/** Deletes the dataset (its rows and alerts cascade) and its CSV in Storage. Runs are kept, detached. */
export async function deleteDataset(id: string): Promise<Result> {
  const db = getBrowserSupabase();
  const { data: dataset } = await db.from("datasets").select("storage_path").eq("id", id).maybeSingle();
  const { error } = await db.from("datasets").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  if (dataset?.storage_path) await db.storage.from("plant-csv").remove([dataset.storage_path]);
  return { ok: true };
}

/** Saves an edited plant row back to Postgres. */
export async function updatePlantRow(datasetId: string, row: PlantRow): Promise<Result> {
  const at = toIso(row.timestamp);
  if (!at) return { ok: false, error: "Unreadable timestamp." };
  const patch: Record<string, number> = {};
  for (const field of ROW_FIELDS) patch[field] = row[field];
  const { error } = await getBrowserSupabase()
    .from("plant_data")
    .update(patch)
    .eq("dataset_id", datasetId)
    .eq("recorded_at", at);
  return error ? { ok: false, error: error.message } : { ok: true };
}

// ---- Runs and alerts ----------------------------------------------------------------------------

export type RunRow = {
  id: string;
  dataset_id: string | null;
  recorded_at: string;
  mode: "simulation" | "twin";
  engine: "mock" | "dwsim";
  status: "queued" | "running" | "converged" | "failed" | "stopped";
  error_message: string | null;
  created_at: string;
  simulation_results: { hot_outlet_temperature: number; cold_outlet_temperature: number; heat_duty: number } | null;
  ml_predictions: { heat_duty: number | null; is_demo: boolean } | null;
};

export type AlertRow = {
  id: string;
  run_id: string | null;
  recorded_at: string;
  variable: string;
  unit: string;
  actual: number;
  expected: number;
  ml_prediction: number | null;
  deviation: number;
  severity: "WARNING" | "ANOMALY";
  acknowledged: boolean;
  created_at: string;
};

export async function listRuns(limit = 200): Promise<RunRow[]> {
  const { data } = await getBrowserSupabase()
    .from("simulation_runs")
    .select(
      "id,dataset_id,recorded_at,mode,engine,status,error_message,created_at,simulation_results(hot_outlet_temperature,cold_outlet_temperature,heat_duty),ml_predictions(heat_duty,is_demo)",
    )
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data as unknown as RunRow[]) ?? [];
}

export async function listAlerts(limit = 300): Promise<AlertRow[]> {
  const { data } = await getBrowserSupabase()
    .from("alerts")
    .select("id,run_id,recorded_at,variable,unit,actual,expected,ml_prediction,deviation,severity,acknowledged,created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data as AlertRow[]) ?? [];
}

/** Acknowledges the given alerts, or every open alert when no ids are passed. */
export async function acknowledgeAlerts(ids?: string[]): Promise<Result> {
  let query = getBrowserSupabase().from("alerts").update({ acknowledged: true }).eq("acknowledged", false);
  if (ids) query = query.in("id", ids);
  const { error } = await query;
  return error ? { ok: false, error: error.message } : { ok: true };
}

/**
 * Fills a dataset with demo runs, results, ML predictions and alerts so every screen has data.
 * Everything is flagged as demo (`engine = mock`, `is_demo = true`); real ML models replace it later.
 */
export async function seedDemoRuns(
  datasetId: string,
  items: { row: PlantRow; output: SimulationOutput; prediction: MlPrediction }[],
  equipment: EquipmentSpecs,
  anomalies: AnomalyRow[],
): Promise<Result<{ runs: number; alerts: number }>> {
  const db = getBrowserSupabase();
  const { count } = await db
    .from("simulation_runs")
    .select("id", { count: "exact", head: true })
    .eq("dataset_id", datasetId);
  if ((count ?? 0) > 0) return { ok: false, error: "This dataset already has runs." };

  const now = new Date().toISOString();
  const usable = items.flatMap((item) => {
    const at = toIso(item.row.timestamp);
    return at && item.output.status === "Converged" ? [{ ...item, at }] : [];
  });
  if (usable.length === 0) return { ok: false, error: "No convergent rows to store." };

  const { data: runs, error: runError } = await db
    .from("simulation_runs")
    .insert(
      usable.map((u) => ({
        dataset_id: datasetId,
        recorded_at: u.at,
        mode: "twin",
        engine: "mock",
        status: "converged",
        equipment,
        started_at: now,
        finished_at: now,
      })),
    )
    .select("id,recorded_at");
  if (runError || !runs) return { ok: false, error: runError?.message ?? "Could not store runs." };

  const runByLabel = new Map(runs.map((r) => [toLabel(r.recorded_at), r.id as string]));
  const tasks = [
    db.from("simulation_results").insert(
      usable.map((u) => ({
        run_id: runByLabel.get(u.row.timestamp),
        hot_outlet_temperature: u.output.hot_outlet_temperature,
        cold_outlet_temperature: u.output.cold_outlet_temperature,
        hot_outlet_pressure: u.output.hot_outlet_pressure,
        cold_outlet_pressure: u.output.cold_outlet_pressure,
        heat_duty: u.output.heat_duty,
        lmtd: u.output.lmtd,
        reynolds_hot: u.output.reynolds_hot,
        reynolds_cold: u.output.reynolds_cold,
        pressure_drop_hot: u.output.pressure_drop_hot,
        pressure_drop_cold: u.output.pressure_drop_cold,
        raw: u.output,
      })),
    ),
    db.from("ml_predictions").insert(
      usable.map((u) => ({
        run_id: runByLabel.get(u.row.timestamp),
        model_name: "demo-seed",
        model_version: "0",
        is_demo: true,
        hot_outlet_temperature: u.prediction.hot_outlet_temperature,
        cold_outlet_temperature: u.prediction.cold_outlet_temperature,
        heat_duty: u.prediction.heat_duty,
      })),
    ),
  ];
  const flagged = anomalies.filter((a) => a.status !== "NORMAL" && runByLabel.has(a.timestamp));
  if (flagged.length > 0) {
    tasks.push(
      db.from("alerts").insert(
        flagged.map((a) => ({
          run_id: runByLabel.get(a.timestamp),
          dataset_id: datasetId,
          recorded_at: toIso(a.timestamp),
          variable: a.variable,
          unit: a.unit,
          actual: a.actual,
          expected: a.expected,
          ml_prediction: a.mlPrediction,
          deviation: a.deviation,
          severity: a.status,
        })),
      ),
    );
  }
  const outcomes = await Promise.all(tasks);
  const failure = outcomes.find((o) => o.error);
  if (failure?.error) return { ok: false, error: failure.error.message };
  return { ok: true, runs: usable.length, alerts: flagged.length };
}

async function functionError(error: unknown, fallback: string) {
  const context = (error as { context?: Response })?.context;
  if (context && typeof context.json === "function") {
    try {
      const body = await context.json();
      const detail = Array.isArray(body.errors) && body.errors.length ? ` ${body.errors.slice(0, 2).join(" ")}` : "";
      return `${body.error ?? fallback}${detail}`;
    } catch {
      /* fall through */
    }
  }
  return (error as Error)?.message ?? fallback;
}

/** Uploads the CSV to Storage (under the user's own folder), then has the Edge Function validate and ingest it. */
export async function uploadAndIngest(
  csv: string,
  name: string,
  source: "upload" | "sample",
): Promise<Result<{ dataset: DatasetInfo }>> {
  const db = getBrowserSupabase();
  const { data: auth } = await db.auth.getUser();
  if (!auth.user) return { ok: false, error: "Sign in first." };

  const safe = name.replace(/[^\w.-]+/g, "_").replace(/\.csv$/i, "").slice(0, 60) || "plant";
  const path = `${auth.user.id}/${Date.now()}-${safe}.csv`;
  const upload = await db.storage.from("plant-csv").upload(path, new Blob([csv], { type: "text/csv" }), {
    contentType: "text/csv",
  });
  if (upload.error) return { ok: false, error: `Storage: ${upload.error.message}` };

  const { data, error } = await db.functions.invoke("twin-api?action=ingest-dataset", {
    body: { storagePath: path, name, source },
  });
  if (error) {
    await db.storage.from("plant-csv").remove([path]);
    return { ok: false, error: await functionError(error, "Ingest failed.") };
  }
  return { ok: true, dataset: data.dataset };
}

// ---- Simulation + ML (Edge Functions) -------------------------------------------------------------

/** Stores a run on the server. Twin mode also scores it with the demo ML model and raises alerts. */
export async function persistRun(
  datasetId: string | null,
  row: PlantRow,
  equipment: EquipmentSpecs,
  mode: "simulation" | "twin",
): Promise<Result<{ runId: string }>> {
  const db = getBrowserSupabase();
  const sim = await db.functions.invoke("twin-api?action=simulate", {
    body: { datasetId, row, equipment, mode },
  });
  if (sim.error) return { ok: false, error: await functionError(sim.error, "Simulation was not saved.") };
  const runId = sim.data.runId as string;

  if (mode === "twin") {
    const ml = await db.functions.invoke("twin-api?action=ml-predict", { body: { runId, row } });
    if (ml.error) return { ok: false, error: await functionError(ml.error, "ML prediction was not saved.") };
  }
  return { ok: true, runId };
}

// ---- Realtime -------------------------------------------------------------------------------------

/** Pushes finished runs and new alerts into the Messages panel as they are written. */
export function subscribeMonitoring(
  userId: string,
  onEvent: (text: string, level: MessageLevel) => void,
) {
  const db = getBrowserSupabase();
  const filter = `owner_id=eq.${userId}`;
  const channel = db
    .channel(`monitoring-${userId}`)
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "simulation_runs", filter }, (payload) => {
      const run = payload.new as { status: string; engine: string; recorded_at: string; error_message?: string };
      if (run.status === "converged") {
        onEvent(`Run saved for ${toLabel(run.recorded_at)} (${run.engine}): converged.`, "success");
      } else if (run.status === "failed") {
        onEvent(`Run for ${toLabel(run.recorded_at)} failed: ${run.error_message ?? "unknown error"}`, "error");
      }
    })
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "alerts", filter }, (payload) => {
      const alert = payload.new as { severity: string; variable: string; deviation: number; unit: string; recorded_at: string };
      onEvent(
        `${alert.severity}: ${alert.variable} deviates ${alert.deviation} ${alert.unit} at ${toLabel(alert.recorded_at)}.`,
        alert.severity === "ANOMALY" ? "error" : "warning",
      );
    })
    .subscribe();
  return () => {
    void db.removeChannel(channel);
  };
}
