export type SimStatus =
  | "Idle"
  | "Queued"
  | "Running"
  | "Converged"
  | "Failed"
  | "Stopped";

export type AnomalyStatus = "NORMAL" | "WARNING" | "ANOMALY";

export type MessageLevel = "info" | "success" | "warning" | "error";

export type ObjectId = "E-1" | "P-1" | "P-2" | "S1" | "S2" | "S3" | "S4";

export type BottomTab = "streams" | "simulation" | "charts" | "messages";

export type ChartTab =
  | "temperature"
  | "enthalpy"
  | "convergence"
  | "twin"
  | "sensitivity";

export type PropertyTab = "general" | "specifications" | "results";

export type MenuId =
  | "file"
  | "home"
  | "simulation"
  | "dynamics"
  | "flowsheet"
  | "thermodynamics"
  | "tools"
  | "view"
  | "help";

export type PlantRow = {
  id: string;
  timestamp: string;
  hot_flow: number;
  hot_temperature: number;
  hot_pressure: number;
  cooling_flow: number;
  cooling_temperature: number;
  cooling_pressure: number;
  composition: number;
  hot_outlet_spec: number;
  hot_outlet_actual: number;
  cold_outlet_actual: number;
  hot_outlet_pressure_actual: number;
  cold_outlet_pressure_actual: number;
};

export type CalculationType =
  | "Specify Outlet Temperature"
  | "Specify Heat Duty"
  | "Specify Area";

export type EquipmentSpecs = {
  calculationType: CalculationType;
  u: number;
  area: number;
  heatDutySpec: number;
  pressureDropHot: number;
  pressureDropCold: number;
  description: string;
};

export type SimulationOutput = {
  hot_outlet_temperature: number;
  cold_outlet_temperature: number;
  hot_outlet_pressure: number;
  cold_outlet_pressure: number;
  heat_duty: number;
  lmtd: number;
  reynolds_hot: number;
  reynolds_cold: number;
  pressure_drop_hot: number;
  pressure_drop_cold: number;
  status: "Converged" | "Failed";
  error_message: string;
  mode: "mock";
};

export type StreamColumn = {
  id: "S1" | "S2" | "S3" | "S4";
  name: string;
  temperature: number;
  pressure: number;
  massFlow: number;
  molarFlow: number;
  vaporFraction: number;
  enthalpy: number;
  density: number;
  composition: number;
};

export type MlPrediction = {
  hot_outlet_temperature: number;
  cold_outlet_temperature: number;
  heat_duty: number;
};

export type AnomalyRow = {
  timestamp: string;
  variable: string;
  unit: string;
  actual: number;
  expected: number;
  deviation: number;
  mlPrediction: number;
  status: AnomalyStatus;
};

export type AppMessage = {
  id: string;
  level: MessageLevel;
  text: string;
  time: string;
};

export type Selection =
  | { kind: "object"; id: ObjectId }
  | { kind: "unavailable"; name: string };

export type ProfilePoint = {
  x: number;
  hot: number;
  cold: number;
};

export type ConvergencePoint = {
  iteration: number;
  residual: number;
};
