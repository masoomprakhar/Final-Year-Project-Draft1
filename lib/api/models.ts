import { getBrowserSupabase } from "@/lib/supabase/client";
import { DEMO_MODEL_SEED, type ModelKind, type ModelRecord } from "@/lib/ml/registry";

type Result = { ok: true } | { ok: false; error: string };
const COLUMNS = "id,name,version,kind,endpoint_url,description,is_active,created_at";

/** Lists the user's models, creating the active demo model the first time. */
export async function listModels(): Promise<ModelRecord[]> {
  const db = getBrowserSupabase();
  let { data } = await db.from("ml_models").select(COLUMNS).order("created_at");
  if (!data || data.length === 0) {
    await db.from("ml_models").insert({ ...DEMO_MODEL_SEED, is_active: true });
    ({ data } = await db.from("ml_models").select(COLUMNS).order("created_at"));
  }
  return (data as ModelRecord[]) ?? [];
}

export async function registerModel(input: {
  name: string;
  version: string;
  kind: ModelKind;
  endpoint_url: string;
  description: string;
}): Promise<Result> {
  const { error } = await getBrowserSupabase().from("ml_models").insert({
    name: input.name.trim(),
    version: input.version.trim() || "1",
    kind: input.kind,
    endpoint_url: input.kind === "http" ? input.endpoint_url.trim() : null,
    description: input.description.trim() || null,
  });
  return error ? { ok: false, error: error.message } : { ok: true };
}

/** Only one model is active at a time (enforced by a unique partial index), so clear then set. */
export async function activateModel(id: string): Promise<Result> {
  const db = getBrowserSupabase();
  const cleared = await db.from("ml_models").update({ is_active: false }).eq("is_active", true);
  if (cleared.error) return { ok: false, error: cleared.error.message };
  const { error } = await db.from("ml_models").update({ is_active: true }).eq("id", id);
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function deleteModel(id: string): Promise<Result> {
  const { error } = await getBrowserSupabase().from("ml_models").delete().eq("id", id);
  return error ? { ok: false, error: error.message } : { ok: true };
}
