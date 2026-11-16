import { runMock, type SimulationInput } from "./mockHeatExchanger.ts";
import type { SimulationOutput } from "./types.ts";

/**
 * The seam where a real solver plugs in. Every engine takes the same input and returns the same
 * SimulationOutput, so swapping the mock for DWSIM (or a FastAPI service) changes nothing else.
 */
export interface SimulationEngine {
  readonly name: "mock" | "dwsim";
  solve(input: SimulationInput): Promise<SimulationOutput>;
}

export const mockEngine: SimulationEngine = {
  name: "mock",
  solve: (input) => Promise.resolve(runMock(input)),
};

/**
 * Calls an external DWSIM service (see docs/DWSIM_INTEGRATION.md). It is used only when
 * DWSIM_API_URL is set, and falls back to a Failed result instead of silently using mock numbers.
 */
export function dwsimEngine(baseUrl: string, token?: string): SimulationEngine {
  return {
    name: "dwsim",
    async solve(input) {
      const res = await fetch(`${baseUrl.replace(/\/$/, "")}/solve/heat-exchanger`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(input),
        signal: AbortSignal.timeout(25_000),
      });
      if (!res.ok) throw new Error(`DWSIM service answered ${res.status}.`);
      const output = (await res.json()) as SimulationOutput;
      return { ...output, mode: "mock" as const }; // contract field kept; engine is recorded on the run row
    },
  };
}

export function selectEngine(): SimulationEngine {
  const url = Deno.env.get("DWSIM_API_URL");
  return url ? dwsimEngine(url, Deno.env.get("DWSIM_API_TOKEN") ?? undefined) : mockEngine;
}
