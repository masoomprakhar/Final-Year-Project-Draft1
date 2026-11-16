import assert from "node:assert/strict";
import { test } from "node:test";
import { CATALOG, defaultSpecs } from "../lib/flowsheet/flowsheetCatalog";
import { autoLayout } from "../lib/flowsheet/flowsheetLayout";
import { solveFlowsheet } from "../lib/flowsheet/flowsheetSolver";
import type { FlowStream, FlowUnit } from "../lib/flowsheet/flowsheetTypes";

const unit = (id: string, type: FlowUnit["type"], specs: Record<string, number> = {}): FlowUnit => ({
  id, tag: id.toUpperCase(), type, x: 0, y: 0, specs: { ...defaultSpecs(type), ...specs },
});
const stream = (id: string, from: string | null, to: string | null, extra: Partial<FlowStream> = {}): FlowStream => ({
  id, tag: id, fromUnitId: from, fromPort: 0, toUnitId: to, toPort: 0, flow: 40, temperature: 35.2, pressure: 2.1, ...extra,
});

test("heat exchanger reproduces the reference case (125.3 kW, 28.4 / 33.6 C)", () => {
  const units = [unit("e1", "exchanger")];
  const streams = [
    stream("s1", null, "e1", { flow: 40, temperature: 35.2, pressure: 2.1 }),
    stream("s3", null, "e1", { toPort: 1, flow: 850, temperature: 31.2, pressure: 1.8 }),
    stream("s2", "e1", null),
    stream("s4", "e1", null, { fromPort: 1 }),
  ];
  const solution = solveFlowsheet(units, streams);
  assert.equal(solution.ok, true, solution.errors.join("; "));
  assert.equal(solution.streams.s2.temperature, 28.4);
  assert.equal(solution.streams.s4.temperature, 33.6);
  assert.equal(solution.units.e1.results.find((r) => r.label === "Heat duty")?.value, 125.3);
});

test("a chain passes conditions downstream: pump raises pressure, cooler lowers temperature", () => {
  const units = [unit("p1", "pump", { dp: 2 }), unit("c1", "cooler", { duty: 60 })];
  const streams = [
    stream("a", null, "p1", { flow: 120, temperature: 55, pressure: 1.6 }),
    stream("b", "p1", "c1"),
    stream("c", "c1", null),
  ];
  const solution = solveFlowsheet(units, streams);
  assert.equal(solution.ok, true, solution.errors.join("; "));
  assert.equal(solution.streams.b.pressure, 3.6);
  assert.ok(solution.streams.c.temperature < solution.streams.b.temperature);
  assert.equal(solution.streams.c.flow, 120);
});

test("mixer combines two feeds by flow-weighted temperature", () => {
  const units = [unit("m1", "mixer")];
  const streams = [
    stream("f1", null, "m1", { flow: 40, temperature: 40, pressure: 2 }),
    stream("f2", null, "m1", { toPort: 1, flow: 60, temperature: 20, pressure: 1.5 }),
    stream("out", "m1", null),
  ];
  const solution = solveFlowsheet(units, streams);
  assert.equal(solution.streams.out.flow, 100);
  assert.equal(solution.streams.out.temperature, 28);
  assert.equal(solution.streams.out.pressure, 1.5);
});

test("splitter feeds two products whose flows add up", () => {
  const units = [unit("s1", "splitter", { split: 0.25 })];
  const streams = [
    stream("in", null, "s1", { flow: 100 }),
    stream("o1", "s1", null),
    stream("o2", "s1", null, { fromPort: 1 }),
  ];
  const solution = solveFlowsheet(units, streams);
  assert.equal(solution.streams.o1.flow + solution.streams.o2.flow, 100);
  assert.equal(solution.streams.o1.flow, 25);
});

test("an unconnected inlet falls back to the unit's own feed and warns", () => {
  const solution = solveFlowsheet([unit("h1", "heater")], [stream("out", "h1", null)]);
  assert.equal(solution.ok, true);
  assert.equal(solution.warnings.length, 1);
  assert.ok(solution.streams.out.temperature > 35.2);
});

test("a recycle loop is reported instead of looping forever", () => {
  const units = [unit("a", "heater"), unit("b", "cooler")];
  const streams = [stream("ab", "a", "b"), stream("ba", "b", "a")];
  const solution = solveFlowsheet(units, streams);
  assert.equal(solution.ok, false);
  assert.match(solution.errors[0], /Recycle loop/);
});

test("an invalid exchanger spec fails that unit and blocks what is downstream", () => {
  const units = [unit("e1", "exchanger", { hotOut: 50 }), unit("v1", "valve")];
  const streams = [
    stream("h", null, "e1"),
    stream("c", null, "e1", { toPort: 1, flow: 850, temperature: 31.2, pressure: 1.8 }),
    stream("ho", "e1", "v1"),
  ];
  const solution = solveFlowsheet(units, streams);
  assert.equal(solution.ok, false);
  assert.equal(solution.units.e1.status, "error");
  assert.equal(solution.units.v1.status, "error");
});

test("every catalog unit has ports and solves with its own defaults", () => {
  for (const type of Object.keys(CATALOG) as FlowUnit["type"][]) {
    const entry = CATALOG[type];
    const units = [unit("u", type)];
    const streams: FlowStream[] = [];
    for (let i = 0; i < entry.outlets; i += 1) streams.push(stream(`o${i}`, "u", null, { fromPort: i }));
    const solution = solveFlowsheet(units, streams);
    assert.equal(solution.units.u.status, "ok", `${type}: ${solution.errors.join("; ")}`);
    for (let i = 0; i < entry.outlets; i += 1) assert.ok(solution.streams[`o${i}`], `${type} outlet ${i}`);
  }
});

test("auto-layout puts downstream units to the right of upstream ones", () => {
  const units = [unit("a", "heater"), unit("b", "cooler"), unit("c", "valve")];
  const streams = [stream("ab", "a", "b"), stream("bc", "b", "c")];
  const pos = autoLayout(units, streams);
  assert.ok(pos.a.x < pos.b.x && pos.b.x < pos.c.x);
});
