import { json, requireUserId, toTimestamptz, userClient } from "../_shared/http.ts";
import { parsePlantCsv } from "../_shared/parsePlantCsv.ts";

const MAX_BYTES = 2_000_000;

/** Reads a CSV the user uploaded to Storage, validates it, and stores it as a dataset + plant_data rows. */
export async function handler(req: Request): Promise<Response> {
  const { db, error } = userClient(req);
  if (error) return error;
  const userId = await requireUserId(db);
  if (!userId) return json({ error: "Not signed in." }, 401);

  let body: { storagePath?: unknown; name?: unknown; source?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Body must be JSON." }, 400);
  }
  const path = typeof body.storagePath === "string" ? body.storagePath : "";
  if (!path.startsWith(`${userId}/`) || path.includes("..")) {
    return json({ error: "storagePath must be inside your own folder." }, 403);
  }

  const { data: file, error: downloadError } = await db.storage.from("plant-csv").download(path);
  if (downloadError || !file) return json({ error: "Could not read the uploaded file." }, 404);
  if (file.size > MAX_BYTES) return json({ error: "CSV is too large (2 MB max)." }, 413);

  const parsed = parsePlantCsv(await file.text());
  if (parsed.errors.length > 0 || parsed.rows.length === 0) {
    return json({ error: "CSV validation failed.", errors: parsed.errors }, 422);
  }

  const byTime = new Map<string, (typeof parsed.rows)[number]>();
  const badTimestamps: string[] = [];
  for (const row of parsed.rows) {
    const at = toTimestamptz(row.timestamp);
    if (!at) badTimestamps.push(row.timestamp);
    else byTime.set(at, row);
  }
  if (badTimestamps.length > 0) {
    return json({ error: "Some timestamps could not be read.", errors: badTimestamps.slice(0, 5).map((t) => `Unreadable timestamp: ${t}`) }, 422);
  }

  const source = body.source === "sample" ? "sample" : "upload";
  const name =
    typeof body.name === "string" && body.name.trim() ? body.name.trim().slice(0, 120) : path.split("/").pop()!;

  const { data: dataset, error: datasetError } = await db
    .from("datasets")
    .insert({ owner_id: userId, name, source, storage_path: path, row_count: byTime.size })
    .select("id,name,source,row_count,created_at")
    .single();
  if (datasetError) return json({ error: datasetError.message }, 500);

  const records = [...byTime.entries()].map(([recorded_at, r]) => ({
    owner_id: userId,
    dataset_id: dataset.id,
    recorded_at,
    hot_flow: r.hot_flow,
    hot_temperature: r.hot_temperature,
    hot_pressure: r.hot_pressure,
    cooling_flow: r.cooling_flow,
    cooling_temperature: r.cooling_temperature,
    cooling_pressure: r.cooling_pressure,
    composition: r.composition,
    hot_outlet_spec: r.hot_outlet_spec,
    hot_outlet_actual: r.hot_outlet_actual,
    cold_outlet_actual: r.cold_outlet_actual,
    hot_outlet_pressure_actual: r.hot_outlet_pressure_actual,
    cold_outlet_pressure_actual: r.cold_outlet_pressure_actual,
  }));
  const { error: rowsError } = await db.from("plant_data").insert(records);
  if (rowsError) {
    await db.from("datasets").delete().eq("id", dataset.id);
    return json({ error: rowsError.message }, 500);
  }

  return json({ dataset, inferredActuals: parsed.inferredActuals }, 201);
}
