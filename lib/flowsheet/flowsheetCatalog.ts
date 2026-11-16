import { UNIT_DEFINITIONS } from "@/lib/data/unitModels";
import type { UnitType } from "@/lib/flowsheet/flowsheetTypes";

export type SpecField = {
  key: string;
  label: string;
  unit: string;
  value: number;
  /** Set when a connected inlet stream supplies this value instead of the spec. */
  feed?: { inlet: number; kind: "flow" | "temperature" | "pressure" };
};

type InletKeys = { flow: string; temperature: string; pressure: string };

export type CatalogEntry = {
  type: UnitType;
  label: string;
  tagPrefix: string;
  inlets: number;
  outlets: number;
  inletLabels: string[];
  outletLabels: string[];
  specs: SpecField[];
  /** Which spec keys a connected inlet overrides, per inlet. */
  inletKeys: InletKeys[];
  /** Used for an inlet that has no stream connected (and no spec key to fall back on). */
  inletFallback: { flow: number; temperature: number; pressure: number }[];
  /** Index into evaluateUnit().streams for each outlet; empty for custom models. */
  outletIndex: number[];
};

const SINGLE: InletKeys = { flow: "flow", temperature: "tin", pressure: "pin" };

function fromDefinition(
  type: Exclude<UnitType, "pump" | "exchanger">,
  tagPrefix: string,
  inletLabels: string[],
  outletLabels: string[],
  inletKeys: InletKeys[],
  outletIndex: number[],
): CatalogEntry {
  const definition = UNIT_DEFINITIONS[type];
  const kinds = ["flow", "temperature", "pressure"] as const;
  const specs: SpecField[] = definition.specs.map((field) => {
    for (let inlet = 0; inlet < inletKeys.length; inlet += 1) {
      for (const kind of kinds) {
        if (inletKeys[inlet][kind] === field.key) return { ...field, feed: { inlet, kind } };
      }
    }
    return { ...field };
  });
  return {
    type,
    label: definition.typeLabel,
    tagPrefix,
    inlets: inletLabels.length,
    outlets: outletLabels.length,
    inletLabels,
    outletLabels,
    specs,
    inletKeys,
    inletFallback: inletKeys.map((keys) => ({
      flow: definition.specs.find((f) => f.key === keys.flow)?.value ?? 40,
      temperature: definition.specs.find((f) => f.key === keys.temperature)?.value ?? 25,
      pressure: definition.specs.find((f) => f.key === keys.pressure)?.value ?? 1,
    })),
    outletIndex,
  };
}

export const CATALOG: Record<UnitType, CatalogEntry> = {
  heater: fromDefinition("heater", "H", ["Process in"], ["Process out"], [SINGLE], [1]),
  cooler: fromDefinition("cooler", "C", ["Process in"], ["Process out"], [SINGLE], [1]),
  mixer: fromDefinition(
    "mixer",
    "M",
    ["Feed 1", "Feed 2"],
    ["Outlet"],
    [
      { flow: "f1", temperature: "t1", pressure: "p1" },
      { flow: "f2", temperature: "t2", pressure: "p2" },
    ],
    [2],
  ),
  splitter: fromDefinition("splitter", "SPL", ["Feed"], ["Outlet 1", "Outlet 2"], [SINGLE], [1, 2]),
  reactor: fromDefinition("reactor", "R", ["Feed"], ["Product"], [SINGLE], [1]),
  column: fromDefinition("column", "T", ["Feed"], ["Distillate", "Bottoms"], [SINGLE], [1, 2]),
  compressor: fromDefinition("compressor", "K", ["Suction"], ["Discharge"], [SINGLE], [1]),
  valve: fromDefinition("valve", "V", ["Inlet"], ["Outlet"], [SINGLE], [1]),
  flash: fromDefinition("flash", "FL", ["Feed"], ["Vapor", "Liquid"], [SINGLE], [1, 2]),
  separator: fromDefinition("separator", "SEP", ["Feed"], ["Light", "Heavy"], [SINGLE], [1, 2]),
  pump: {
    type: "pump",
    label: "Pump",
    tagPrefix: "P",
    inlets: 1,
    outlets: 1,
    inletLabels: ["Suction"],
    outletLabels: ["Discharge"],
    specs: [
      { key: "dp", label: "Pressure rise", unit: "bar", value: 3 },
      { key: "eff", label: "Efficiency", unit: "fraction", value: 0.7 },
    ],
    inletKeys: [{ flow: "", temperature: "", pressure: "" }],
    inletFallback: [{ flow: 40, temperature: 25, pressure: 1 }],
    outletIndex: [],
  },
  exchanger: {
    type: "exchanger",
    label: "Heat Exchanger",
    tagPrefix: "E",
    inlets: 2,
    outlets: 2,
    inletLabels: ["Hot in", "Cold in"],
    outletLabels: ["Hot out", "Cold out"],
    specs: [
      { key: "hotOut", label: "Hot outlet temperature", unit: "°C", value: 28.4 },
      { key: "dpHot", label: "Hot-side pressure drop", unit: "bar", value: 0.1 },
      { key: "dpCold", label: "Cold-side pressure drop", unit: "bar", value: 0.1 },
    ],
    inletKeys: [
      { flow: "", temperature: "", pressure: "" },
      { flow: "", temperature: "", pressure: "" },
    ],
    inletFallback: [
      { flow: 40, temperature: 35.2, pressure: 2.1 },
      { flow: 850, temperature: 31.2, pressure: 1.8 },
    ],
    outletIndex: [],
  },
};

export const UNIT_TYPES = Object.keys(CATALOG) as UnitType[];

export function defaultSpecs(type: UnitType): Record<string, number> {
  return Object.fromEntries(CATALOG[type].specs.map((field) => [field.key, field.value]));
}

/** Next free tag such as H-1, H-2 for a unit type or S1, S2 for streams. */
export function nextTag(prefix: string, existing: string[], separator = "-"): string {
  const used = new Set(existing);
  let n = 1;
  while (used.has(`${prefix}${separator}${n}`)) n += 1;
  return `${prefix}${separator}${n}`;
}
