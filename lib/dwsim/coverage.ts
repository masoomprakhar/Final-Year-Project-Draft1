import type { UnitType } from "@/lib/flowsheet/flowsheetTypes";

/** What the DWSIM service can take over. `stub` = also modelled by the service's built-in stand-in. */
export type DwsimCoverage = {
  feature: string;
  area: "Workbench" | "Flowsheet unit";
  dwsimObject: string;
  inStub: boolean;
  unitType?: UnitType;
};

export const DWSIM_COVERAGE: DwsimCoverage[] = [
  { feature: "Heat exchanger (plant-row twin)", area: "Workbench", dwsimObject: "HeatExchanger", inStub: true, unitType: "exchanger" },
  { feature: "Heater", area: "Flowsheet unit", dwsimObject: "Heater", inStub: true, unitType: "heater" },
  { feature: "Cooler", area: "Flowsheet unit", dwsimObject: "Cooler", inStub: true, unitType: "cooler" },
  { feature: "Pump", area: "Flowsheet unit", dwsimObject: "Pump", inStub: true, unitType: "pump" },
  { feature: "Valve", area: "Flowsheet unit", dwsimObject: "Valve", inStub: true, unitType: "valve" },
  { feature: "Mixer", area: "Flowsheet unit", dwsimObject: "NodeIn (mixer)", inStub: true, unitType: "mixer" },
  { feature: "Splitter", area: "Flowsheet unit", dwsimObject: "NodeOut (splitter)", inStub: true, unitType: "splitter" },
  { feature: "Compressor", area: "Flowsheet unit", dwsimObject: "Compressor", inStub: false, unitType: "compressor" },
  { feature: "Flash drum", area: "Flowsheet unit", dwsimObject: "Vessel", inStub: false, unitType: "flash" },
  { feature: "Separator", area: "Flowsheet unit", dwsimObject: "Vessel", inStub: false, unitType: "separator" },
  { feature: "Reactor", area: "Flowsheet unit", dwsimObject: "Reactor (needs a reaction set)", inStub: false, unitType: "reactor" },
  { feature: "Distillation column", area: "Flowsheet unit", dwsimObject: "DistillationColumn", inStub: false, unitType: "column" },
];

export const DWSIM_NOT_COVERED = ["Dynamic step tests (mock first-order model)", "ML predictions", "Optimization grid search", "Reports and storage"];
