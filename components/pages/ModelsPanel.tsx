"use client";

import { useCallback, useEffect, useState } from "react";
import { StoredNotice } from "@/components/bottom/StoredNotice";
import { activateModel, deleteModel, listModels, registerModel } from "@/lib/api/models";
import { DEMO_METRICS } from "@/lib/ml/mockModel";
import { runModel, type ModelRecord } from "@/lib/ml/registry";
import { REFERENCE, runMock, toSimulationInput } from "@/lib/simulation/mockHeatExchanger";
import { SAMPLE_ROWS } from "@/lib/data/samplePlantData";
import { DEFAULT_EQUIPMENT } from "@/lib/simulation/mockHeatExchanger";
import { useTwin } from "@/lib/store/TwinProvider";

export function ModelsPanel() {
  const { backendEnabled, userEmail, notify } = useTwin();
  const [models, setModels] = useState<ModelRecord[]>([]);
  const [form, setForm] = useState({ name: "", version: "1", endpoint_url: "", description: "" });
  const [busy, setBusy] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const signedIn = backendEnabled && !!userEmail;

  const refresh = useCallback(async () => setModels(await listModels()), []);
  useEffect(() => {
    if (signedIn) void refresh();
  }, [signedIn, refresh]);

  if (!signedIn) return <StoredNotice />;

  async function act(work: () => Promise<{ ok: boolean; error?: string }>, done: string) {
    setBusy(true);
    const result = await work();
    setBusy(false);
    if (result.ok) {
      notify(done, "success");
      await refresh();
    } else notify(result.error ?? "Failed.", "error");
  }

  async function test(model: ModelRecord) {
    setTestResult("Calling…");
    try {
      const row = SAMPLE_ROWS[0];
      const expected = runMock(toSimulationInput(row, DEFAULT_EQUIPMENT));
      const out = await runModel(model, row, expected);
      setTestResult(
        `${model.name}: hot out ${out.hot_outlet_temperature} °C, cold out ${out.cold_outlet_temperature} °C, duty ${out.heat_duty} kW (physics reference ${REFERENCE.heatDuty} kW)`,
      );
    } catch (error) {
      setTestResult(`${model.name} failed: ${error instanceof Error ? error.message : "unknown error"}`);
    }
  }

  return (
    <div className="grid h-full grid-cols-[minmax(0,1.3fr)_minmax(300px,1fr)] overflow-auto text-[12px]">
      <div className="border-r border-[#e5e5e5] p-3">
        <p className="mb-2 text-[#444]">
          The active model scores runs. The demo model ships with the app; register your own HTTP endpoint to swap it.
        </p>
        <table className="w-full border-collapse">
          <thead className="bg-[#f7f7f7]">
            <tr>{["Model", "Version", "Kind", "Status", ""].map((h) => <th key={h} className="border border-[#e1e1e1] px-2 py-0.5 text-left font-semibold">{h}</th>)}</tr>
          </thead>
          <tbody>
            {models.map((m) => (
              <tr key={m.id}>
                <td className="border border-[#eee] px-2 py-0.5" title={m.description ?? undefined}>{m.name}</td>
                <td className="border border-[#eee] px-2 py-0.5">{m.version}</td>
                <td className="border border-[#eee] px-2 py-0.5">{m.kind}</td>
                <td className={`border border-[#eee] px-2 py-0.5 ${m.is_active ? "font-semibold text-[#0f7a32]" : ""}`}>{m.is_active ? "Active" : "Inactive"}</td>
                <td className="space-x-1 whitespace-nowrap border border-[#eee] px-2 py-0.5 text-right">
                  <button type="button" disabled={busy} onClick={() => void test(m)} className="text-[#1f4e79] underline">Test</button>
                  {!m.is_active && <button type="button" disabled={busy} onClick={() => void act(() => activateModel(m.id), `${m.name} is now active.`)} className="text-[#1f4e79] underline">Activate</button>}
                  {!m.is_active && <button type="button" disabled={busy} onClick={() => void act(() => deleteModel(m.id), `${m.name} removed.`)} className="text-[#b42318] underline">Delete</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {testResult && <p className="mt-2 border border-[#e1e1e1] bg-[#fafafa] p-2">{testResult}</p>}
        <p className="mb-1 mt-4 font-semibold">Demo model quality ({DEMO_METRICS.label})</p>
        <table className="w-full border-collapse">
          <tbody>
            {DEMO_METRICS.targets.map((t) => (
              <tr key={t.name}>
                <td className="border border-[#eee] px-2 py-0.5">{t.name}</td>
                <td className="border border-[#eee] px-2 py-0.5 text-right">MAE {t.mae} {t.unit}</td>
                <td className="border border-[#eee] px-2 py-0.5 text-right">R² {t.r2}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <form
        className="space-y-2 p-3"
        onSubmit={(event) => {
          event.preventDefault();
          void act(() => registerModel({ ...form, kind: "http" }), `${form.name} registered. Test it, then activate it.`);
        }}
      >
        <p className="font-semibold">Register an HTTP model</p>
        {(["name", "version", "endpoint_url", "description"] as const).map((key) => (
          <label key={key} className="block">
            <span className="text-[#555]">{key === "endpoint_url" ? "Endpoint URL (https)" : key}</span>
            <input
              required={key !== "description"}
              value={form[key]}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              className="mt-0.5 h-7 w-full border border-[#c5c5c5] px-2 outline-none focus:border-[#2b7cd3]"
            />
          </label>
        ))}
        <button disabled={busy} className="h-7 border border-[#1f4e79] px-3 font-semibold text-[#1f4e79] hover:bg-[#e7f1fb] disabled:opacity-40">Register</button>
        <p className="text-[#555]">
          Contract: POST <code>{"{ row, expected }"}</code>, answer <code>{"{ hot_outlet_temperature, cold_outlet_temperature, heat_duty }"}</code>. The endpoint must allow browser calls (CORS).
        </p>
      </form>
    </div>
  );
}
