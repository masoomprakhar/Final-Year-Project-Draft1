import assert from "node:assert/strict";
import { test } from "node:test";
import { simulateStep } from "../lib/dynamics";
import { FEATURES } from "../lib/featureMap";
import { optimize } from "../lib/optimization";
import { waterProperties } from "../lib/thermo";

test("step test starts at the base state and settles at the new one", () => {
  const pts = simulateStep({ variable: "cooling_flow", changePercent: -20, stepAtMin: 5, durationMin: 80, tauMin: 5 });
  assert.equal(pts[0].cold, pts[1].cold);
  assert.ok(pts.at(-1)!.cold > pts[0].cold, "less cooling water should warm the cold outlet");
});

test("optimizer returns a feasible best point and respects limits", () => {
  const r = optimize({ maxColdOutlet: 35, maxHotOutlet: 30, pumpCostPerUnit: 10, chillerCostPerKw: 1 });
  assert.ok(r.best && r.best.coldOut <= 35 && r.best.hotOut <= 30);
  assert.equal(optimize({ maxColdOutlet: 20, maxHotOutlet: 30, pumpCostPerUnit: 10, chillerCostPerKw: 1 }).best, null);
});

test("water properties are plausible at 25 C", () => {
  const p = waterProperties(25);
  assert.ok(Math.abs(p.density - 997) < 1 && Math.abs(p.viscosityMPas - 0.89) < 0.05 && Math.abs(p.cp - 4.18) < 0.02);
});

test("feature map has unique names", () => {
  assert.equal(new Set(FEATURES.map((f) => f.name)).size, FEATURES.length);
});
