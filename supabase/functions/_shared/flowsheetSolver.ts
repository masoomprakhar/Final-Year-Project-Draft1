// GENERATED from lib/flowsheet/flowsheetSolver.ts by scripts/sync-edge-shared.mjs. Do not edit here.
import { round } from "./format.ts";
import { evaluateUnit } from "./unitModels.ts";
import { CATALOG } from "./flowsheetCatalog.ts";
import type {
  FlowStream,
  FlowUnit,
  FlowsheetSolution,
  SolvedStream,
  UnitOutcome,
} from "./flowsheetTypes.ts";
import { REFERENCE, runMock } from "./mockHeatExchanger.ts";

type Conditions = { flow: number; temperature: number; pressure: number };
type UnitSolve = { outlets: SolvedStream[]; outcome: UnitOutcome };

function outcome(status: UnitOutcome["status"], messages: string[] = [], results: UnitOutcome["results"] = []): UnitOutcome {
  return { status, messages, results };
}

function solveUnit(unit: FlowUnit, inlets: Conditions[]): UnitSolve {
  const entry = CATALOG[unit.type];

  if (unit.type === "pump") {
    const [inlet] = inlets;
    const dp = Math.max(unit.specs.dp ?? 3, 0);
    const eff = Math.min(1, Math.max(0.2, unit.specs.eff ?? 0.7));
    const power = (inlet.flow * dp) / (36 * eff) / 1000;
    const out: SolvedStream = {
      flow: inlet.flow,
      temperature: round(inlet.temperature + dp * 0.02, 2),
      pressure: round(inlet.pressure + dp, 2),
      vaporFraction: 0,
    };
    return {
      outlets: [out],
      outcome: outcome("ok", [], [
        { label: "Outlet pressure", value: out.pressure, unit: "bar", digits: 2 },
        { label: "Outlet temperature", value: out.temperature, unit: "°C", digits: 2 },
        { label: "Power", value: round(power, 3), unit: "kW", digits: 3 },
      ]),
    };
  }

  if (unit.type === "exchanger") {
    const [hot, cold] = inlets;
    const result = runMock({
      hot_flow: hot.flow,
      hot_temperature: hot.temperature,
      hot_pressure: hot.pressure,
      cooling_flow: cold.flow,
      cooling_temperature: cold.temperature,
      cooling_pressure: cold.pressure,
      composition: 1,
      hot_outlet_temperature_spec: unit.specs.hotOut ?? 28.4,
      pressure_drop_hot_spec: unit.specs.dpHot ?? 0.1,
      pressure_drop_cold_spec: unit.specs.dpCold ?? 0.1,
      calculation_type: "Specify Outlet Temperature",
      heat_duty_spec: REFERENCE.heatDuty,
      u: REFERENCE.u,
      area: REFERENCE.area,
    });
    if (result.status === "Failed") return { outlets: [], outcome: outcome("error", [result.error_message]) };
    return {
      outlets: [
        { flow: hot.flow, temperature: result.hot_outlet_temperature, pressure: result.hot_outlet_pressure, vaporFraction: 0 },
        { flow: cold.flow, temperature: result.cold_outlet_temperature, pressure: result.cold_outlet_pressure, vaporFraction: 0 },
      ],
      outcome: outcome("ok", [], [
        { label: "Heat duty", value: result.heat_duty, unit: "kW", digits: 1 },
        { label: "LMTD", value: result.lmtd, unit: "°C", digits: 1 },
        { label: "Hot outlet temperature", value: result.hot_outlet_temperature, unit: "°C", digits: 1 },
        { label: "Cold outlet temperature", value: result.cold_outlet_temperature, unit: "°C", digits: 1 },
      ]),
    };
  }

  // Every other unit goes through the same model the unit views use; the connected inlet
  // streams replace that model's own feed specs.
  const specs: Record<string, number> = { ...unit.specs };
  entry.inletKeys.forEach((keys, index) => {
    const inlet = inlets[index];
    specs[keys.flow] = inlet.flow;
    specs[keys.temperature] = inlet.temperature;
    specs[keys.pressure] = inlet.pressure;
  });
  const evaluated = evaluateUnit(unit.type, specs);
  const outlets = entry.outletIndex.map((index): SolvedStream => {
    const stream = evaluated.streams[index];
    return {
      flow: stream.massFlow,
      temperature: stream.temperature,
      pressure: stream.pressure,
      vaporFraction: stream.vaporFraction,
    };
  });
  return { outlets, outcome: outcome("ok", [], evaluated.results.map((r) => ({ ...r }))) };
}

/**
 * Sequential-modular solve: units run in dependency order, each unit's outlet conditions become
 * the conditions of the stream leaving it. A recycle loop is reported, not iterated.
 */
export function solveFlowsheet(units: FlowUnit[], streams: FlowStream[]): FlowsheetSolution {
  const errors: string[] = [];
  const warnings: string[] = [];
  const solvedStreams: Record<string, SolvedStream> = {};
  const outcomes: Record<string, UnitOutcome> = {};
  const unitIds = new Set(units.map((u) => u.id));

  const inbound = new Map<string, Map<number, FlowStream>>();
  const outbound = new Map<string, Map<number, FlowStream>>();
  const deps = new Map<string, Set<string>>(units.map((u) => [u.id, new Set<string>()]));

  for (const stream of streams) {
    const from = stream.fromUnitId && unitIds.has(stream.fromUnitId) ? stream.fromUnitId : null;
    const to = stream.toUnitId && unitIds.has(stream.toUnitId) ? stream.toUnitId : null;
    if (to) {
      const ports = inbound.get(to) ?? new Map<number, FlowStream>();
      if (ports.has(stream.toPort)) warnings.push(`${stream.tag} and ${ports.get(stream.toPort)!.tag} enter the same port; ${stream.tag} is ignored.`);
      else ports.set(stream.toPort, stream);
      inbound.set(to, ports);
    }
    if (from) {
      const ports = outbound.get(from) ?? new Map<number, FlowStream>();
      ports.set(stream.fromPort, stream);
      outbound.set(from, ports);
    }
    if (from && to) deps.get(to)!.add(from);
    if (!from) {
      solvedStreams[stream.id] = {
        flow: stream.flow,
        temperature: stream.temperature,
        pressure: stream.pressure,
        vaporFraction: 0,
      };
    }
  }

  // Dependency order (Kahn). Anything left over sits on a recycle loop.
  const remaining = new Map(units.map((u) => [u.id, new Set(deps.get(u.id)!)]));
  const order: string[] = [];
  const ready = units.filter((u) => remaining.get(u.id)!.size === 0).map((u) => u.id);
  while (ready.length > 0) {
    const id = ready.shift()!;
    order.push(id);
    for (const [other, waiting] of remaining) {
      if (waiting.delete(id) && waiting.size === 0 && !order.includes(other) && !ready.includes(other)) ready.push(other);
    }
  }
  const byId = new Map(units.map((u) => [u.id, u]));
  if (order.length < units.length) {
    const loop = units.filter((u) => !order.includes(u.id)).map((u) => u.tag);
    errors.push(`Recycle loop through ${loop.join(", ")}. Loops are not solved yet; remove one connection.`);
    for (const tag of loop) {
      const unit = units.find((u) => u.tag === tag)!;
      outcomes[unit.id] = outcome("error", ["Part of a recycle loop."]);
    }
  }

  for (const id of order) {
    const unit = byId.get(id)!;
    const entry = CATALOG[unit.type];
    const messages: string[] = [];
    let blocked = false;

    const inlets: Conditions[] = [];
    for (let port = 0; port < entry.inlets; port += 1) {
      const stream = inbound.get(unit.id)?.get(port);
      if (stream) {
        const solved = solvedStreams[stream.id];
        if (!solved) {
          blocked = true;
          messages.push(`${stream.tag} has no solved conditions (upstream unit failed).`);
          inlets.push(entry.inletFallback[port]);
        } else {
          inlets.push({ flow: solved.flow, temperature: solved.temperature, pressure: solved.pressure });
        }
      } else {
        const keys = entry.inletKeys[port];
        const fallback = entry.inletFallback[port];
        inlets.push(
          keys.flow
            ? {
                flow: unit.specs[keys.flow] ?? fallback.flow,
                temperature: unit.specs[keys.temperature] ?? fallback.temperature,
                pressure: unit.specs[keys.pressure] ?? fallback.pressure,
              }
            : fallback,
        );
        warnings.push(`${unit.tag}: ${entry.inletLabels[port]} is not connected; using the unit's own feed values.`);
      }
    }

    if (blocked) {
      outcomes[unit.id] = outcome("error", messages);
      errors.push(`${unit.tag} was not solved: ${messages.join(" ")}`);
      continue;
    }

    const solved = solveUnit(unit, inlets);
    outcomes[unit.id] = solved.outcome;
    if (solved.outcome.status === "error") {
      errors.push(`${unit.tag}: ${solved.outcome.messages.join(" ")}`);
      continue;
    }
    outbound.get(unit.id)?.forEach((stream, port) => {
      const out = solved.outlets[port];
      if (!out) {
        errors.push(`${stream.tag} leaves ${unit.tag} port ${port + 1}, but ${entry.label} has ${entry.outlets} outlet(s).`);
        return;
      }
      solvedStreams[stream.id] = out;
    });
  }

  for (const unit of units) {
    if (!outcomes[unit.id]) outcomes[unit.id] = outcome("error", ["Not solved."]);
  }
  return { ok: errors.length === 0, errors, warnings, streams: solvedStreams, units: outcomes, order };
}
