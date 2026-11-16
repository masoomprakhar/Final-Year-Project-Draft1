export type DwsimHealth =
  | { state: "unconfigured" }
  | { state: "offline"; error: string }
  | { state: "online"; engine: "stub" | "dwsim"; realDwsim: boolean; units: string[] };

export const DWSIM_URL = (process.env.NEXT_PUBLIC_DWSIM_API_URL ?? "").replace(/\/$/, "");

/** Checks the DWSIM service from the browser. The service must allow this origin (CORS_ORIGINS). */
export async function checkDwsim(url = DWSIM_URL, fetchImpl: typeof fetch = fetch): Promise<DwsimHealth> {
  if (!url) return { state: "unconfigured" };
  try {
    const res = await fetchImpl(`${url}/health`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return { state: "offline", error: `Service answered ${res.status}.` };
    const body = await res.json();
    return { state: "online", engine: body.engine, realDwsim: !!body.real_dwsim, units: body.units ?? [] };
  } catch (error) {
    return { state: "offline", error: error instanceof Error ? error.message : "Unreachable." };
  }
}

export type DwsimTest = { ok: true; ms: number; hotOut: number; coldOut: number; duty: number } | { ok: false; error: string };

/** Solves the reference heat-exchanger case on the service so you can see it answering. */
export async function testDwsimSolve(url = DWSIM_URL, fetchImpl: typeof fetch = fetch): Promise<DwsimTest> {
  if (!url) return { ok: false, error: "No service URL configured." };
  const started = Date.now();
  try {
    const res = await fetchImpl(`${url}/solve/heat-exchanger`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        hot_flow: 40, hot_temperature: 35.2, hot_pressure: 2.1, cooling_flow: 850, cooling_temperature: 31.2,
        cooling_pressure: 1.8, composition: 1, hot_outlet_temperature_spec: 28.4, pressure_drop_hot_spec: 0.1,
        pressure_drop_cold_spec: 0.1, calculation_type: "Specify Outlet Temperature", heat_duty_spec: 125.3, u: 500, area: 50,
      }),
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return { ok: false, error: `Service answered ${res.status}.` };
    const out = await res.json();
    if (out.status !== "Converged") return { ok: false, error: out.error_message || "Did not converge." };
    return { ok: true, ms: Date.now() - started, hotOut: out.hot_outlet_temperature, coldOut: out.cold_outlet_temperature, duty: out.heat_duty };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unreachable." };
  }
}
