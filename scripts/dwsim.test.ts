import assert from "node:assert/strict";
import { test } from "node:test";
import { checkDwsim } from "../lib/dwsim/client";
import { DWSIM_COVERAGE } from "../lib/dwsim/coverage";
import { UNIT_TYPES } from "../lib/flowsheet/flowsheetCatalog";

test("every flowsheet unit type is listed in DWSIM coverage", () => {
  const covered = new Set(DWSIM_COVERAGE.map((c) => c.unitType));
  for (const type of UNIT_TYPES) assert.ok(covered.has(type), `${type} missing from coverage`);
});

test("health check reports unconfigured, online and offline", async () => {
  assert.deepEqual(await checkDwsim("", fetch), { state: "unconfigured" });
  const ok = (async () => new Response(JSON.stringify({ engine: "stub", real_dwsim: false, units: ["pump"] }))) as unknown as typeof fetch;
  assert.deepEqual(await checkDwsim("https://x", ok), { state: "online", engine: "stub", realDwsim: false, units: ["pump"] });
  const down = (async () => { throw new Error("boom"); }) as unknown as typeof fetch;
  assert.equal((await checkDwsim("https://x", down)).state, "offline");
});
