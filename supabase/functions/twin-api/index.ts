import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, json } from "../_shared/http.ts";
import { handler as ingest } from "./ingest.ts";
import { handler as predict } from "./predict.ts";
import { handler as simulate } from "./simulate.ts";

/**
 * One function, three actions, so a request pays one cold start. The business logic lives in
 * ../_shared (synced from lib/) and can move behind a FastAPI service without touching callers:
 * keep the action names and JSON shapes and change only where they are forwarded.
 *
 *   POST /functions/v1/twin-api?action=ingest-dataset  { storagePath, name, source }
 *   POST /functions/v1/twin-api?action=simulate        { datasetId, row, equipment, mode }
 *   POST /functions/v1/twin-api?action=ml-predict      { runId, row }
 */
Deno.serve((req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Use POST." }, 405);
  switch (new URL(req.url).searchParams.get("action")) {
    case "ingest-dataset":
      return ingest(req);
    case "simulate":
      return simulate(req);
    case "ml-predict":
      return predict(req);
    default:
      return json({ error: "Unknown action. Use ingest-dataset, simulate or ml-predict." }, 400);
  }
});
