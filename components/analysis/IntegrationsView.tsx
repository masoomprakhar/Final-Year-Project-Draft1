"use client";

import { useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { useTwin } from "@/lib/store/TwinProvider";

type Probe = "idle" | "checking" | "deployed" | "missing" | "error";

async function probe(name: string, body: object): Promise<Probe> {
  const { error } = await getBrowserSupabase().functions.invoke(name, { body });
  if (!error) return "deployed";
  const status = (error as { context?: Response }).context?.status;
  if (status === 404) return "missing";
  return status ? "deployed" : "error"; // a 400/422 answer means the function is running
}

export function IntegrationsView() {
  const { backendEnabled, userEmail } = useTwin();
  const [state, setState] = useState<Record<string, Probe>>({});
  const check = async (name: string, body: object) => {
    setState((s) => ({ ...s, [name]: "checking" }));
    const result = await probe(name, body).catch(() => "error" as Probe);
    setState((s) => ({ ...s, [name]: result }));
  };
  const rows = [
    { name: "twin-api", desc: "Dataset ingest, mock simulation, ML scoring", body: {} },
    { name: "flowsheet-api", desc: "Server-side flowsheet solve and run history", body: {} },
  ];
  const label: Record<Probe, string> = { idle: "Not checked", checking: "Checking…", deployed: "Deployed", missing: "Not deployed (run the deploy command)", error: "Unreachable" };
  return (
    <div className="space-y-4 p-4 text-[12px]">
      <table className="w-full max-w-3xl border-collapse">
        <thead className="bg-[#f7f7f7]"><tr>{["Service", "Purpose", "Status", ""].map((h) => <th key={h} className="border border-[#e1e1e1] px-2 py-1 text-left">{h}</th>)}</tr></thead>
        <tbody>
          <tr><td className="border border-[#eee] px-2 py-1 font-semibold">Supabase</td><td className="border border-[#eee] px-2 py-1">Database, Auth, Storage</td>
            <td className="border border-[#eee] px-2 py-1" colSpan={2}>{!backendEnabled ? "Not configured (local-only mode)" : userEmail ? `Connected as ${userEmail}` : "Configured, signed out"}</td></tr>
          {rows.map((r) => (
            <tr key={r.name}>
              <td className="border border-[#eee] px-2 py-1 font-semibold">{r.name}</td><td className="border border-[#eee] px-2 py-1">{r.desc}</td>
              <td className="border border-[#eee] px-2 py-1">{label[state[r.name] ?? "idle"]}</td>
              <td className="border border-[#eee] px-2 py-1"><button type="button" disabled={!backendEnabled || !userEmail} onClick={() => void check(r.name, r.body)} className="text-[#1f4e79] underline disabled:text-[#999] disabled:no-underline">Check</button></td>
            </tr>
          ))}
          <tr><td className="border border-[#eee] px-2 py-1 font-semibold">DWSIM service</td><td className="border border-[#eee] px-2 py-1">Rigorous unit operations</td><td className="border border-[#eee] px-2 py-1" colSpan={2}>Planned. Set <code>DWSIM_API_URL</code> on twin-api (docs/DWSIM_INTEGRATION.md).</td></tr>
          <tr><td className="border border-[#eee] px-2 py-1 font-semibold">ML model</td><td className="border border-[#eee] px-2 py-1">Trained predictor</td><td className="border border-[#eee] px-2 py-1" colSpan={2}>Demo model active. Register yours on the ML Models page or set <code>ML_API_URL</code>.</td></tr>
        </tbody>
      </table>
      {!userEmail && backendEnabled && <p className="text-[#555]">Sign in to check the Edge Functions.</p>}
    </div>
  );
}
