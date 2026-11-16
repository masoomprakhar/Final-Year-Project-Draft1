import { getBrowserSupabase } from "@/lib/supabase/client";
import type { FlowDoc, FlowStream, FlowUnit, FlowsheetSolution } from "@/lib/flowsheet/flowsheetTypes";

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

export async function loadFlowsheets(): Promise<FlowDoc[]> {
  const db = getBrowserSupabase();
  const [sheets, units, streams] = await Promise.all([
    db.from("flowsheets").select("id,name").order("created_at"),
    db.from("flowsheet_units").select("id,flowsheet_id,tag,unit_type,x,y,specs"),
    db.from("flowsheet_streams").select("id,flowsheet_id,tag,from_unit_id,from_port,to_unit_id,to_port,flow,temperature,pressure"),
  ]);
  return (sheets.data ?? []).map((sheet) => ({
    id: sheet.id,
    name: sheet.name,
    units: (units.data ?? [])
      .filter((u) => u.flowsheet_id === sheet.id)
      .map((u): FlowUnit => ({ id: u.id, tag: u.tag, type: u.unit_type, x: u.x, y: u.y, specs: u.specs ?? {} })),
    streams: (streams.data ?? [])
      .filter((s) => s.flowsheet_id === sheet.id)
      .map((s): FlowStream => ({
        id: s.id, tag: s.tag, fromUnitId: s.from_unit_id, fromPort: s.from_port,
        toUnitId: s.to_unit_id, toPort: s.to_port, flow: s.flow, temperature: s.temperature, pressure: s.pressure,
      })),
  }));
}

/** Writes the whole document: parents first, then rows that no longer exist are removed. */
export async function saveFlowsheet(doc: FlowDoc): Promise<Result> {
  const db = getBrowserSupabase();
  const sheet = await db.from("flowsheets").upsert({ id: doc.id, name: doc.name, updated_at: new Date().toISOString() });
  if (sheet.error) return { ok: false, error: sheet.error.message };

  if (doc.units.length > 0) {
    const { error } = await db.from("flowsheet_units").upsert(
      doc.units.map((u) => ({ id: u.id, flowsheet_id: doc.id, tag: u.tag, unit_type: u.type, x: u.x, y: u.y, specs: u.specs })),
    );
    if (error) return { ok: false, error: error.message };
  }
  if (doc.streams.length > 0) {
    const { error } = await db.from("flowsheet_streams").upsert(
      doc.streams.map((s) => ({
        id: s.id, flowsheet_id: doc.id, tag: s.tag, from_unit_id: s.fromUnitId, from_port: s.fromPort,
        to_unit_id: s.toUnitId, to_port: s.toPort, flow: s.flow, temperature: s.temperature, pressure: s.pressure,
      })),
    );
    if (error) return { ok: false, error: error.message };
  }

  for (const [table, ids] of [
    ["flowsheet_streams", doc.streams.map((s) => s.id)],
    ["flowsheet_units", doc.units.map((u) => u.id)],
  ] as const) {
    let query = db.from(table).delete().eq("flowsheet_id", doc.id);
    if (ids.length > 0) query = query.not("id", "in", `(${ids.join(",")})`);
    const { error } = await query;
    if (error) return { ok: false, error: error.message };
  }
  return { ok: true };
}

export async function deleteFlowsheet(id: string): Promise<Result> {
  const { error } = await getBrowserSupabase().from("flowsheets").delete().eq("id", id);
  return error ? { ok: false, error: error.message } : { ok: true };
}

/** Solves the saved copy on the server and records a run. */
export async function solveOnServer(flowsheetId: string): Promise<Result<{ runId: string; solution: FlowsheetSolution }>> {
  const { data, error } = await getBrowserSupabase().functions.invoke("flowsheet-api", { body: { flowsheetId } });
  if (error) return { ok: false, error: error.message };
  if (data?.error) return { ok: false, error: String(data.error) };
  return { ok: true, runId: data.runId, solution: data.solution };
}
