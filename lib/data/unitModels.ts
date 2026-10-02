import { round } from "@/lib/format";
import type { StreamColumn } from "@/lib/types";

export type UnitSpecField = {
  key: string;
  label: string;
  value: number;
  unit: string;
};

export type UnitResultField = {
  label: string;
  value: number;
  unit: string;
  digits: number;
};

export type UnitEvaluation = {
  id: string;
  name: string;
  typeLabel: string;
  description: string;
  specs: UnitSpecField[];
  results: UnitResultField[];
  streams: StreamColumn[];
  connections: string;
};

type SpecSeed = { key: string; label: string; value: number; unit: string };

const DEFINITIONS: Record<string, { name: string; typeLabel: string; description: string; specs: SpecSeed[] }> = {
  heater: {
    name: "H-1",
    typeLabel: "Heater",
    description: "Process heater. Steam raises the feed temperature.",
    specs: [
      { key: "flow", label: "Process flow", value: 40, unit: "kg/h" },
      { key: "tin", label: "Inlet temperature", value: 35.2, unit: "°C" },
      { key: "pin", label: "Inlet pressure", value: 2.1, unit: "bar" },
      { key: "duty", label: "Heat duty", value: 80, unit: "kW" },
      { key: "steamT", label: "Steam temperature", value: 160, unit: "°C" },
    ],
  },
  cooler: {
    name: "C-1",
    typeLabel: "Cooler",
    description: "Process cooler. Cooling water removes heat from the feed.",
    specs: [
      { key: "flow", label: "Process flow", value: 120, unit: "kg/h" },
      { key: "tin", label: "Inlet temperature", value: 55, unit: "°C" },
      { key: "pin", label: "Inlet pressure", value: 1.6, unit: "bar" },
      { key: "duty", label: "Heat removed", value: 60, unit: "kW" },
      { key: "cwT", label: "Cooling-water inlet", value: 25, unit: "°C" },
      { key: "cwFlow", label: "Cooling-water flow", value: 400, unit: "kg/h" },
    ],
  },
  mixer: {
    name: "M-1",
    typeLabel: "Mixer",
    description: "Combines two liquid feeds into one outlet.",
    specs: [
      { key: "f1", label: "Feed 1 flow", value: 40, unit: "kg/h" },
      { key: "t1", label: "Feed 1 temperature", value: 35.2, unit: "°C" },
      { key: "p1", label: "Feed 1 pressure", value: 2.1, unit: "bar" },
      { key: "f2", label: "Feed 2 flow", value: 25, unit: "kg/h" },
      { key: "t2", label: "Feed 2 temperature", value: 22, unit: "°C" },
      { key: "p2", label: "Feed 2 pressure", value: 1.5, unit: "bar" },
    ],
  },
  splitter: {
    name: "SPL-1",
    typeLabel: "Splitter",
    description: "Splits one feed into two outlets by mass fraction.",
    specs: [
      { key: "flow", label: "Feed flow", value: 100, unit: "kg/h" },
      { key: "tin", label: "Feed temperature", value: 33.6, unit: "°C" },
      { key: "pin", label: "Feed pressure", value: 1.7, unit: "bar" },
      { key: "split", label: "Outlet 1 fraction", value: 0.35, unit: "mass frac." },
    ],
  },
  reactor: {
    name: "R-1",
    typeLabel: "Reactor",
    description: "Conversion reactor with a dummy heat release.",
    specs: [
      { key: "flow", label: "Feed flow", value: 80, unit: "kg/h" },
      { key: "tin", label: "Feed temperature", value: 40, unit: "°C" },
      { key: "pin", label: "Feed pressure", value: 3, unit: "bar" },
      { key: "conversion", label: "Conversion", value: 0.62, unit: "fraction" },
    ],
  },
  column: {
    name: "T-1",
    typeLabel: "Distillation Column",
    description: "Binary column with a fixed dummy split and reflux.",
    specs: [
      { key: "flow", label: "Feed flow", value: 200, unit: "kg/h" },
      { key: "tin", label: "Feed temperature", value: 85, unit: "°C" },
      { key: "pin", label: "Feed pressure", value: 1.2, unit: "bar" },
      { key: "reflux", label: "Reflux ratio", value: 1.4, unit: "-" },
    ],
  },
  compressor: {
    name: "K-1",
    typeLabel: "Compressor",
    description: "Gas compressor. Outlet temperature rises with pressure ratio.",
    specs: [
      { key: "flow", label: "Inlet flow", value: 60, unit: "kg/h" },
      { key: "tin", label: "Inlet temperature", value: 30, unit: "°C" },
      { key: "pin", label: "Inlet pressure", value: 1.1, unit: "bar" },
      { key: "pout", label: "Outlet pressure", value: 4.4, unit: "bar" },
      { key: "eff", label: "Efficiency", value: 0.75, unit: "fraction" },
    ],
  },
  valve: {
    name: "V-1",
    typeLabel: "Valve",
    description: "Pressure-reducing valve. Opening sets the outlet pressure.",
    specs: [
      { key: "flow", label: "Flow", value: 40, unit: "kg/h" },
      { key: "tin", label: "Inlet temperature", value: 28.4, unit: "°C" },
      { key: "pin", label: "Inlet pressure", value: 2, unit: "bar" },
      { key: "opening", label: "Opening", value: 0.7, unit: "fraction" },
    ],
  },
  flash: {
    name: "FL-1",
    typeLabel: "Flash Drum",
    description: "Isothermal flash. Vapor fraction sets the vapor and liquid flows.",
    specs: [
      { key: "flow", label: "Feed flow", value: 150, unit: "kg/h" },
      { key: "tin", label: "Feed temperature", value: 95, unit: "°C" },
      { key: "pin", label: "Feed pressure", value: 1.5, unit: "bar" },
      { key: "vf", label: "Vapor fraction", value: 0.22, unit: "fraction" },
    ],
  },
  separator: {
    name: "V-101",
    typeLabel: "Separator",
    description: "Two-phase separator with a light and a heavy product.",
    specs: [
      { key: "flow", label: "Feed flow", value: 180, unit: "kg/h" },
      { key: "tin", label: "Feed temperature", value: 42, unit: "°C" },
      { key: "pin", label: "Feed pressure", value: 2.4, unit: "bar" },
      { key: "split", label: "Light fraction", value: 0.18, unit: "mass frac." },
    ],
  },
  energy: {
    name: "Q-1",
    typeLabel: "Energy Stream",
    description: "Energy stream carrying the exchanger duty.",
    specs: [
      { key: "duty", label: "Heat flow", value: 125.3, unit: "kW" },
      { key: "tin", label: "Temperature", value: 35.2, unit: "°C" },
    ],
  },
  "cw-utility": {
    name: "CW-1",
    typeLabel: "Cooling Water Utility",
    description: "Plant cooling-water supply and return.",
    specs: [
      { key: "flow", label: "Supply flow", value: 900, unit: "kg/h" },
      { key: "supply", label: "Supply temperature", value: 25, unit: "°C" },
      { key: "ret", label: "Return temperature", value: 32, unit: "°C" },
      { key: "pin", label: "Supply pressure", value: 3, unit: "bar" },
    ],
  },
  "steam-utility": {
    name: "STM-1",
    typeLabel: "Steam Utility",
    description: "Low-pressure steam supply.",
    specs: [
      { key: "flow", label: "Steam flow", value: 25, unit: "kg/h" },
      { key: "supply", label: "Supply temperature", value: 180, unit: "°C" },
      { key: "ret", label: "Condensate temperature", value: 160, unit: "°C" },
      { key: "pin", label: "Supply pressure", value: 8, unit: "bar" },
    ],
  },
  "reaction-set": {
    name: "RXN-1",
    typeLabel: "Reaction Set",
    description: "Dummy reaction A + B → C.",
    specs: [
      { key: "conversion", label: "Conversion of A", value: 0.62, unit: "fraction" },
      { key: "rate", label: "Rate", value: 0.18, unit: "kmol/h" },
      { key: "dh", label: "Heat of reaction", value: -42, unit: "kJ/mol" },
    ],
  },
  subflowsheet: {
    name: "SF-1",
    typeLabel: "Subflowsheet",
    description: "Nested cooler block with its own dummy duty.",
    specs: [
      { key: "duty", label: "Block duty", value: 40.2, unit: "kW" },
      { key: "area", label: "Area", value: 18, unit: "m²" },
      { key: "u", label: "U", value: 450, unit: "W/m²·K" },
    ],
  },
  script: {
    name: "SCR-1",
    typeLabel: "Script",
    description: "Last dummy script run on the flowsheet.",
    specs: [
      { key: "iterations", label: "Iterations", value: 12, unit: "-" },
      { key: "objects", label: "Objects touched", value: 6, unit: "-" },
    ],
  },
  spreadsheet: {
    name: "SS-1",
    typeLabel: "Spreadsheet",
    description: "Dummy spreadsheet linked to E-1.",
    specs: [
      { key: "duty", label: "Cell duty", value: 125.3, unit: "kW" },
      { key: "area", label: "Cell area", value: 50, unit: "m²" },
      { key: "lmtd", label: "Cell LMTD", value: 4.8, unit: "°C" },
    ],
  },
};

export const UNIT_IDS = Object.keys(DEFINITIONS);

export function defaultUnitSpecs() {
  const specs: Record<string, Record<string, number>> = {};
  for (const [id, definition] of Object.entries(DEFINITIONS)) {
    specs[id] = Object.fromEntries(definition.specs.map((field) => [field.key, field.value]));
  }
  return specs;
}

function num(specs: Record<string, number>, key: string, fallback: number) {
  const value = specs[key];
  return Number.isFinite(value) ? value : fallback;
}

function flowOf(value: number) {
  return value > 0 ? value : 0.001;
}

function material(
  id: StreamColumn["id"],
  name: string,
  temperature: number,
  pressure: number,
  massFlow: number,
  vaporFraction = 0,
): StreamColumn {
  return {
    id,
    name,
    temperature: round(temperature, 1),
    pressure: round(pressure, 2),
    massFlow: round(massFlow, 1),
    molarFlow: round(massFlow / 18.02, 2),
    vaporFraction: round(vaporFraction, 2),
    enthalpy: round(130.5 + (temperature - 31.2) * 4.18, 1),
    density: round(996.5 - (temperature - 31.2) * 0.3, 1),
    composition: 1,
  };
}

function specFields(id: string, specs: Record<string, number>): UnitSpecField[] {
  return DEFINITIONS[id].specs.map((field) => ({
    ...field,
    value: num(specs, field.key, field.value),
  }));
}

function result(label: string, value: number, unit: string, digits = 1): UnitResultField {
  return { label, value: round(value, digits), unit, digits };
}

export function evaluateUnit(id: string, specs: Record<string, number> = {}): UnitEvaluation {
  const definition = DEFINITIONS[id] ?? DEFINITIONS.heater;
  const fields = specFields(definition === DEFINITIONS[id] ? id : "heater", specs);
  const base = {
    id,
    name: definition.name,
    typeLabel: definition.typeLabel,
    description: definition.description,
    specs: fields,
  };

  if (id === "heater") {
    const flow = flowOf(num(specs, "flow", 40));
    const tin = num(specs, "tin", 35.2);
    const pin = num(specs, "pin", 2.1);
    const duty = Math.max(num(specs, "duty", 80), 0);
    const steamT = num(specs, "steamT", 160);
    const tout = tin + 6.8 * (duty / 125.3) * (40 / flow);
    const pout = pin - 0.05 * (flow / 40) ** 1.8;
    const steamFlow = duty / 2.2;
    return {
      ...base,
      results: [
        result("Outlet temperature", tout, "°C"),
        result("Outlet pressure", pout, "bar", 2),
        result("Heat duty", duty, "kW"),
        result("Steam flow", steamFlow, "kg/h"),
        result("Condensate temperature", steamT - 8, "°C"),
      ],
      streams: [
        material("S1", "Process In", tin, pin, flow),
        material("S2", "Process Out", tout, pout, flow),
        material("S3", "Steam", steamT, 6, steamFlow),
        material("S4", "Condensate", steamT - 8, 5.8, steamFlow),
      ],
      connections: "Process In → H-1 → Process Out. Steam → H-1 → Condensate.",
    };
  }

  if (id === "cooler") {
    const flow = flowOf(num(specs, "flow", 120));
    const tin = num(specs, "tin", 55);
    const pin = num(specs, "pin", 1.6);
    const duty = Math.max(num(specs, "duty", 60), 0);
    const cwT = num(specs, "cwT", 25);
    const cwFlow = flowOf(num(specs, "cwFlow", 400));
    const tout = tin - 6.8 * (duty / 125.3) * (40 / flow);
    const cwOut = cwT + 2.4 * (duty / 125.3) * (850 / cwFlow);
    return {
      ...base,
      results: [
        result("Outlet temperature", tout, "°C"),
        result("Outlet pressure", pin - 0.08, "bar", 2),
        result("Heat removed", duty, "kW"),
        result("Cooling-water outlet", cwOut, "°C"),
      ],
      streams: [
        material("S1", "Process In", tin, pin, flow),
        material("S2", "Process Out", tout, pin - 0.08, flow),
        material("S3", "CW Inlet", cwT, 1.8, cwFlow),
        material("S4", "CW Outlet", cwOut, 1.7, cwFlow),
      ],
      connections: "Process In → C-1 → Process Out. Cooling water → C-1 → CW Outlet.",
    };
  }

  if (id === "mixer") {
    const f1 = Math.max(num(specs, "f1", 40), 0);
    const f2 = Math.max(num(specs, "f2", 25), 0);
    const t1 = num(specs, "t1", 35.2);
    const t2 = num(specs, "t2", 22);
    const p1 = num(specs, "p1", 2.1);
    const p2 = num(specs, "p2", 1.5);
    const total = flowOf(f1 + f2);
    const tout = (f1 * t1 + f2 * t2) / total;
    const pout = Math.min(p1, p2);
    return {
      ...base,
      results: [
        result("Outlet flow", f1 + f2, "kg/h"),
        result("Outlet temperature", tout, "°C"),
        result("Outlet pressure", pout, "bar", 2),
      ],
      streams: [
        material("S1", "Feed 1", t1, p1, f1),
        material("S2", "Feed 2", t2, p2, f2),
        material("S3", "Outlet", tout, pout, f1 + f2),
      ],
      connections: "Feed 1 and Feed 2 → M-1 → Outlet.",
    };
  }

  if (id === "splitter") {
    const flow = Math.max(num(specs, "flow", 100), 0);
    const tin = num(specs, "tin", 33.6);
    const pin = num(specs, "pin", 1.7);
    const split = Math.min(1, Math.max(0, num(specs, "split", 0.35)));
    const out1 = flow * split;
    const out2 = flow - out1;
    return {
      ...base,
      results: [
        result("Outlet 1 flow", out1, "kg/h"),
        result("Outlet 2 flow", out2, "kg/h"),
        result("Outlet temperature", tin, "°C"),
        result("Outlet pressure", pin - 0.02, "bar", 2),
      ],
      streams: [
        material("S1", "Feed", tin, pin, flow),
        material("S2", "Outlet 1", tin, pin - 0.02, out1),
        material("S3", "Outlet 2", tin, pin - 0.02, out2),
      ],
      connections: "Feed → SPL-1 → Outlet 1 and Outlet 2.",
    };
  }

  if (id === "reactor") {
    const flow = flowOf(num(specs, "flow", 80));
    const tin = num(specs, "tin", 40);
    const pin = num(specs, "pin", 3);
    const conversion = Math.min(1, Math.max(0, num(specs, "conversion", 0.62)));
    const tout = tin + 12 * conversion;
    const duty = flow * conversion * 0.8;
    return {
      ...base,
      results: [
        result("Outlet temperature", tout, "°C"),
        result("Outlet pressure", pin - 0.15, "bar", 2),
        result("Heat release", duty, "kW"),
        result("Conversion", conversion, "fraction", 2),
      ],
      streams: [
        material("S1", "Feed", tin, pin, flow),
        material("S2", "Product", tout, pin - 0.15, flow),
      ],
      connections: "Feed → R-1 → Product.",
    };
  }

  if (id === "column") {
    const flow = Math.max(num(specs, "flow", 200), 0);
    const tin = num(specs, "tin", 85);
    const pin = num(specs, "pin", 1.2);
    const reflux = Math.max(num(specs, "reflux", 1.4), 0);
    const distillate = flow * 0.42;
    const bottoms = flow - distillate;
    const condenser = distillate * (1 + reflux) * 0.15;
    return {
      ...base,
      results: [
        result("Distillate flow", distillate, "kg/h"),
        result("Bottoms flow", bottoms, "kg/h"),
        result("Top temperature", 78.5, "°C"),
        result("Bottom temperature", 102, "°C"),
        result("Condenser duty", condenser, "kW"),
      ],
      streams: [
        material("S1", "Feed", tin, pin, flow),
        material("S2", "Distillate", 78.5, pin - 0.1, distillate),
        material("S3", "Bottoms", 102, pin + 0.05, bottoms),
      ],
      connections: "Feed → T-1 → Distillate and Bottoms.",
    };
  }

  if (id === "compressor") {
    const flow = flowOf(num(specs, "flow", 60));
    const tin = num(specs, "tin", 30);
    const pin = flowOf(num(specs, "pin", 1.1));
    const pout = Math.max(num(specs, "pout", 4.4), pin);
    const eff = Math.min(1, Math.max(0.2, num(specs, "eff", 0.75)));
    const ratio = pout / pin;
    const tout = (tin + 273.15) * ratio ** (0.286 / eff) - 273.15;
    const power = (flow / 3600) * 1.005 * (tout - tin);
    return {
      ...base,
      results: [
        result("Outlet temperature", tout, "°C"),
        result("Outlet pressure", pout, "bar", 2),
        result("Pressure ratio", ratio, "-", 2),
        result("Power", power, "kW", 2),
      ],
      streams: [
        material("S1", "Suction", tin, pin, flow),
        material("S2", "Discharge", tout, pout, flow),
      ],
      connections: "Suction → K-1 → Discharge.",
    };
  }

  if (id === "valve") {
    const flow = Math.max(num(specs, "flow", 40), 0);
    const tin = num(specs, "tin", 28.4);
    const pin = num(specs, "pin", 2);
    const opening = Math.min(1, Math.max(0.05, num(specs, "opening", 0.7)));
    const pout = pin * opening;
    const tout = tin - (1 - opening) * 0.6;
    return {
      ...base,
      results: [
        result("Outlet temperature", tout, "°C"),
        result("Outlet pressure", pout, "bar", 2),
        result("Pressure drop", pin - pout, "bar", 2),
      ],
      streams: [
        material("S1", "Inlet", tin, pin, flow),
        material("S2", "Outlet", tout, pout, flow),
      ],
      connections: "Inlet → V-1 → Outlet.",
    };
  }

  if (id === "flash") {
    const flow = Math.max(num(specs, "flow", 150), 0);
    const tin = num(specs, "tin", 95);
    const pin = num(specs, "pin", 1.5);
    const vf = Math.min(1, Math.max(0, num(specs, "vf", 0.22)));
    const vapor = flow * vf;
    const liquid = flow - vapor;
    return {
      ...base,
      results: [
        result("Vapor flow", vapor, "kg/h"),
        result("Liquid flow", liquid, "kg/h"),
        result("Vapor temperature", tin - 1.5, "°C"),
        result("Liquid temperature", tin, "°C"),
      ],
      streams: [
        material("S1", "Feed", tin, pin, flow, vf),
        material("S2", "Vapor", tin - 1.5, pin, vapor, 1),
        material("S3", "Liquid", tin, pin, liquid, 0),
      ],
      connections: "Feed → FL-1 → Vapor and Liquid.",
    };
  }

  if (id === "separator") {
    const flow = Math.max(num(specs, "flow", 180), 0);
    const tin = num(specs, "tin", 42);
    const pin = num(specs, "pin", 2.4);
    const split = Math.min(1, Math.max(0, num(specs, "split", 0.18)));
    const light = flow * split;
    const heavy = flow - light;
    return {
      ...base,
      results: [
        result("Light product", light, "kg/h"),
        result("Heavy product", heavy, "kg/h"),
        result("Outlet pressure", pin - 0.05, "bar", 2),
      ],
      streams: [
        material("S1", "Feed", tin, pin, flow),
        material("S2", "Light", tin - 0.4, pin - 0.05, light),
        material("S3", "Heavy", tin, pin - 0.05, heavy),
      ],
      connections: "Feed → V-101 → Light product and Heavy product.",
    };
  }

  if (id === "cw-utility" || id === "steam-utility") {
    const flow = Math.max(num(specs, "flow", 900), 0);
    const supply = num(specs, "supply", 25);
    const ret = num(specs, "ret", 32);
    const pin = num(specs, "pin", 3);
    const duty = Math.abs(ret - supply) * flow * (125.3 / (6.8 * 40));
    return {
      ...base,
      results: [
        result("Utility duty", duty, "kW"),
        result("Return temperature", ret, "°C"),
        result("Supply pressure", pin, "bar", 2),
      ],
      streams: [
        material("S1", "Supply", supply, pin, flow),
        material("S2", "Return", ret, pin - 0.2, flow),
      ],
      connections: `${definition.name} supply → users → return.`,
    };
  }

  const duty = num(specs, "duty", num(specs, "dh", num(specs, "iterations", 0)));
  return {
    ...base,
    results: fields.map((field) => result(field.label, field.value, field.unit, field.unit === "fraction" ? 2 : 1)),
    streams: [
      material("S1", definition.name, num(specs, "tin", 35.2), 1, Math.max(duty, 1)),
    ],
    connections: `${definition.name} is linked to the main heat-exchanger case.`,
  };
}
