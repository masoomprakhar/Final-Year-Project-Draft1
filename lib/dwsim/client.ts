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
