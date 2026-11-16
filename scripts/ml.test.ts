import assert from "node:assert/strict";
import { test } from "node:test";
import { SAMPLE_ROWS } from "../lib/data/samplePlantData";
import { parsePrediction, runModel } from "../lib/ml/registry";
import { DEFAULT_EQUIPMENT, runMock, toSimulationInput } from "../lib/simulation/mockHeatExchanger";
import { parsePlantCsv, rowsToCsv } from "../lib/csv/parsePlantCsv";

const row = SAMPLE_ROWS[0];
const expected = runMock(toSimulationInput(row, DEFAULT_EQUIPMENT));

test("demo model returns the three predicted values", async () => {
  const out = await runModel({ kind: "demo", endpoint_url: null }, row, expected);
  for (const key of ["hot_outlet_temperature", "cold_outlet_temperature", "heat_duty"] as const) {
    assert.ok(Number.isFinite(out[key]));
  }
});

test("http model posts {row, expected} and validates the answer", async () => {
  let sent: { row?: unknown; expected?: unknown } = {};
  const fake = (async (_url: string, init: RequestInit) => {
    sent = JSON.parse(init.body as string);
    return new Response(JSON.stringify({ hot_outlet_temperature: 28, cold_outlet_temperature: 33, heat_duty: 120 }));
  }) as unknown as typeof fetch;
  const out = await runModel({ kind: "http", endpoint_url: "https://models.example/predict" }, row, expected, fake);
  assert.equal(out.heat_duty, 120);
  assert.ok(sent.row && sent.expected);
});

test("http model rejects insecure URLs, bad status and malformed answers", async () => {
  await assert.rejects(runModel({ kind: "http", endpoint_url: "http://x" }, row, expected), /https/);
  const bad = (async () => new Response("no", { status: 500 })) as unknown as typeof fetch;
  await assert.rejects(runModel({ kind: "http", endpoint_url: "https://x" }, row, expected, bad), /500/);
  assert.throws(() => parsePrediction({ hot_outlet_temperature: 1 }), /cold_outlet_temperature/);
});

test("sample data survives a CSV round trip", () => {
  const parsed = parsePlantCsv(rowsToCsv(SAMPLE_ROWS));
  assert.equal(parsed.rows.length, SAMPLE_ROWS.length);
  assert.equal(parsed.rows[0].hot_flow, SAMPLE_ROWS[0].hot_flow);
});
