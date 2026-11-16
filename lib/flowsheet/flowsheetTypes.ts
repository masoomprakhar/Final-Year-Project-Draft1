export type UnitType =
  | "heater"
  | "cooler"
  | "mixer"
  | "splitter"
  | "reactor"
  | "column"
  | "compressor"
  | "valve"
  | "flash"
  | "separator"
  | "pump"
  | "exchanger";

export type FlowUnit = {
  id: string;
  tag: string;
  type: UnitType;
  /** Centre of the unit on the canvas. */
  x: number;
  y: number;
  specs: Record<string, number>;
};

/**
 * A stream is also the connection. It leaves one port of one unit and enters one port of another.
 * No `fromUnitId` means a free feed (its own conditions are used); no `toUnitId` means a product.
 */
export type FlowStream = {
  id: string;
  tag: string;
  fromUnitId: string | null;
  fromPort: number;
  toUnitId: string | null;
  toPort: number;
  flow: number;
  temperature: number;
  pressure: number;
};

export type FlowDoc = { id: string; name: string; units: FlowUnit[]; streams: FlowStream[] };

export type SolvedStream = {
  flow: number;
  temperature: number;
  pressure: number;
  vaporFraction: number;
};

export type UnitOutcome = {
  status: "ok" | "warning" | "error";
  messages: string[];
  results: { label: string; value: number; unit: string; digits: number }[];
};

export type FlowsheetSolution = {
  ok: boolean;
  errors: string[];
  warnings: string[];
  streams: Record<string, SolvedStream>;
  units: Record<string, UnitOutcome>;
  order: string[];
};
