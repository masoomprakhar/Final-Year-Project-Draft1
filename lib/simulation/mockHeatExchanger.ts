import { round } from "@/lib/format";
import type {
  ConvergencePoint,
  EquipmentSpecs,
  PlantRow,
  ProfilePoint,
  SimulationOutput,
  StreamColumn,
} from "@/lib/types";

export const REFERENCE = {
  hotFlow: 40,
  hotTemperature: 35.2,
  hotPressure: 2.1,
  coolingFlow: 850,
  coolingTemperature: 31.2,
  coolingPressure: 1.8,
  composition: 1,
  hotOutletTemperature: 28.4,
  coldOutletTemperature: 33.6,
  hotOutletPressure: 2.0,
  coldOutletPressure: 1.7,
  heatDuty: 125.3,
  lmtd: 4.8,
  reynoldsHot: 5620,
  reynoldsCold: 18450,
  pressureDropHotResult: 0.08,
  pressureDropColdResult: 0.09,
  pressureDropHotSpec: 0.1,
  pressureDropColdSpec: 0.1,
  u: 500,
  area: 50,
  hotDeltaT: 6.8,
  coldDeltaT: 2.4,
  molarWeight: 18.02,
} as const;

export const DEFAULT_EQUIPMENT: EquipmentSpecs = {
  calculationType: "Specify Outlet Temperature",
  u: REFERENCE.u,
  area: REFERENCE.area,
  heatDutySpec: REFERENCE.heatDuty,
  pressureDropHot: REFERENCE.pressureDropHotSpec,
  pressureDropCold: REFERENCE.pressureDropColdSpec,
  description: "Shell-and-tube heat exchanger. Hot feed is cooled by water.",
};

export type SimulationInput = {
  hot_flow: number;
  hot_temperature: number;
  hot_pressure: number;
  cooling_flow: number;
  cooling_temperature: number;
  cooling_pressure: number;
  composition: number;
  hot_outlet_temperature_spec: number;
  pressure_drop_hot_spec: number;
  pressure_drop_cold_spec: number;
  calculation_type: EquipmentSpecs["calculationType"];
  heat_duty_spec: number;
  u: number;
  area: number;
};

export function toSimulationInput(
  row: PlantRow,
  equipment: EquipmentSpecs,
): SimulationInput {
  return {
    hot_flow: row.hot_flow,
    hot_temperature: row.hot_temperature,
    hot_pressure: row.hot_pressure,
    cooling_flow: row.cooling_flow,
    cooling_temperature: row.cooling_temperature,
    cooling_pressure: row.cooling_pressure,
    composition: row.composition,
    hot_outlet_temperature_spec: row.hot_outlet_spec,
    pressure_drop_hot_spec: equipment.pressureDropHot,
    pressure_drop_cold_spec: equipment.pressureDropCold,
    calculation_type: equipment.calculationType,
    heat_duty_spec: equipment.heatDutySpec,
    u: equipment.u,
    area: equipment.area,
  };
}

export function inputSignature(row: PlantRow, equipment: EquipmentSpecs) {
  return JSON.stringify([
    row.hot_flow,
    row.hot_temperature,
    row.hot_pressure,
    row.cooling_flow,
    row.cooling_temperature,
    row.cooling_pressure,
    row.composition,
    row.hot_outlet_spec,
    equipment.pressureDropHot,
    equipment.pressureDropCold,
    equipment.calculationType,
    equipment.heatDutySpec,
    equipment.u,
    equipment.area,
  ]);
}

export function dutyFromTemperatures(
  hotFlow: number,
  hotIn: number,
  hotOut: number,
) {
  const drop = hotIn - hotOut;
  return round(
    REFERENCE.heatDuty *
      (hotFlow / REFERENCE.hotFlow) *
      (drop / REFERENCE.hotDeltaT),
    1,
  );
}

function failed(message: string): SimulationOutput {
  return {
    hot_outlet_temperature: Number.NaN,
    cold_outlet_temperature: Number.NaN,
    hot_outlet_pressure: Number.NaN,
    cold_outlet_pressure: Number.NaN,
    heat_duty: Number.NaN,
    lmtd: Number.NaN,
    reynolds_hot: Number.NaN,
    reynolds_cold: Number.NaN,
    pressure_drop_hot: Number.NaN,
    pressure_drop_cold: Number.NaN,
    status: "Failed",
    error_message: message,
    mode: "mock",
  };
}

export function runMock(input: SimulationInput): SimulationOutput {
  const numbers = [
    input.hot_flow,
    input.hot_temperature,
    input.hot_pressure,
    input.cooling_flow,
    input.cooling_temperature,
    input.cooling_pressure,
    input.composition,
    input.hot_outlet_temperature_spec,
    input.pressure_drop_hot_spec,
    input.pressure_drop_cold_spec,
    input.heat_duty_spec,
    input.u,
    input.area,
  ];

  if (numbers.some((value) => !Number.isFinite(value))) {
    return failed("Simulation input contains a blank or invalid number.");
  }
  if (input.hot_flow <= 0 || input.cooling_flow <= 0) {
    return failed("Hot flow and cooling flow must both be greater than zero.");
  }
  if (input.hot_pressure <= 0 || input.cooling_pressure <= 0) {
    return failed("Inlet pressures must be greater than zero.");
  }
  if (input.composition < 0 || input.composition > 1) {
    return failed("Composition must be a mass fraction from 0 to 1.");
  }
  if (input.pressure_drop_hot_spec < 0 || input.pressure_drop_cold_spec < 0) {
    return failed("Pressure-drop specifications cannot be negative.");
  }

  let hotOutlet = input.hot_outlet_temperature_spec;
  let heatDuty = 0;
  let coldOutlet = input.cooling_temperature;
  let hotDrop = 0;
  let coldRise = 0;

  if (input.calculation_type === "Specify Outlet Temperature") {
    if (input.hot_outlet_temperature_spec >= input.hot_temperature) {
      return failed(
        "Hot outlet temperature must be below the hot inlet when the outlet is specified.",
      );
    }
    hotDrop = input.hot_temperature - input.hot_outlet_temperature_spec;
    const dutyScale = (input.hot_flow / REFERENCE.hotFlow) * (hotDrop / REFERENCE.hotDeltaT);
    heatDuty = round(REFERENCE.heatDuty * dutyScale, 1);
    coldRise =
      REFERENCE.coldDeltaT *
      (heatDuty / REFERENCE.heatDuty) *
      (REFERENCE.coolingFlow / input.cooling_flow);
    coldOutlet = round(input.cooling_temperature + coldRise, 1);
    hotOutlet = round(input.hot_outlet_temperature_spec, 1);
  } else {
    let duty = input.heat_duty_spec;
    if (input.calculation_type === "Specify Area") {
      if (input.u <= 0 || input.area <= 0) {
        return failed("U and area must be greater than zero.");
      }
      const driving =
        (input.hot_temperature - input.cooling_temperature) /
        (REFERENCE.hotTemperature - REFERENCE.coolingTemperature);
      if (driving <= 0) {
        return failed("Hot inlet must be warmer than the cold inlet when area is specified.");
      }
      duty = REFERENCE.heatDuty * (input.u / REFERENCE.u) * (input.area / REFERENCE.area) * driving;
    }
    if (!(duty > 0)) return failed("Heat duty must be greater than zero.");
    hotDrop = REFERENCE.hotDeltaT * (duty / REFERENCE.heatDuty) * (REFERENCE.hotFlow / input.hot_flow);
    coldRise =
      REFERENCE.coldDeltaT * (duty / REFERENCE.heatDuty) * (REFERENCE.coolingFlow / input.cooling_flow);
    hotOutlet = round(input.hot_temperature - hotDrop, 1);
    coldOutlet = round(input.cooling_temperature + coldRise, 1);
    heatDuty = round(duty, 1);
    if (hotOutlet >= input.hot_temperature) {
      return failed("That duty is too large for the hot-stream flow.");
    }
  }
  const hotFlowRatio = input.hot_flow / REFERENCE.hotFlow;
  const coldFlowRatio = input.cooling_flow / REFERENCE.coolingFlow;
  const pressureDropHot = round(
    REFERENCE.pressureDropHotResult *
      (input.pressure_drop_hot_spec / REFERENCE.pressureDropHotSpec) *
      hotFlowRatio ** 1.8,
    2,
  );
  const pressureDropCold = round(
    REFERENCE.pressureDropColdResult *
      (input.pressure_drop_cold_spec / REFERENCE.pressureDropColdSpec) *
      coldFlowRatio ** 1.8,
    2,
  );

  return {
    hot_outlet_temperature: hotOutlet,
    cold_outlet_temperature: coldOutlet,
    hot_outlet_pressure: round(input.hot_pressure - pressureDropHot, 1),
    cold_outlet_pressure: round(input.cooling_pressure - pressureDropCold, 1),
    heat_duty: heatDuty,
    lmtd: round(
      REFERENCE.lmtd * (hotDrop / REFERENCE.hotDeltaT + Math.abs(coldRise) / REFERENCE.coldDeltaT) / 2,
      1,
    ),
    reynolds_hot: Math.round(REFERENCE.reynoldsHot * hotFlowRatio),
    reynolds_cold: Math.round(REFERENCE.reynoldsCold * coldFlowRatio),
    pressure_drop_hot: pressureDropHot,
    pressure_drop_cold: pressureDropCold,
    status: "Converged",
    error_message: "",
    mode: "mock",
  };
}

function enthalpy(anchorTemperature: number, anchorEnthalpy: number, temperature: number) {
  return round(anchorEnthalpy + (temperature - anchorTemperature) * 4.18, 1);
}

function density(anchorTemperature: number, anchorDensity: number, temperature: number) {
  return round(anchorDensity + (anchorTemperature - temperature) * 0.16, 1);
}

function molarFlow(massFlow: number) {
  if (Math.abs(massFlow - REFERENCE.coolingFlow) < 0.001) return 47.17;
  return round(massFlow / REFERENCE.molarWeight, 2);
}

export function buildStreams(
  row: PlantRow,
  result: SimulationOutput,
): StreamColumn[] {
  const hotOutT = result.hot_outlet_temperature;
  const coldOutT = result.cold_outlet_temperature;
  const hotOutP = result.hot_outlet_pressure;
  const coldOutP = result.cold_outlet_pressure;

  return [
    {
      id: "S1",
      name: "Hot Feed",
      temperature: row.hot_temperature,
      pressure: row.hot_pressure,
      massFlow: row.hot_flow,
      molarFlow: molarFlow(row.hot_flow),
      vaporFraction: 0,
      enthalpy: enthalpy(REFERENCE.hotTemperature, 147.6, row.hot_temperature),
      density: density(REFERENCE.hotTemperature, 995.7, row.hot_temperature),
      composition: row.composition,
    },
    {
      id: "S2",
      name: "Hot Outlet",
      temperature: hotOutT,
      pressure: hotOutP,
      massFlow: row.hot_flow,
      molarFlow: molarFlow(row.hot_flow),
      vaporFraction: 0,
      enthalpy: enthalpy(REFERENCE.hotOutletTemperature, 119.3, hotOutT),
      density: density(REFERENCE.hotOutletTemperature, 996.8, hotOutT),
      composition: row.composition,
    },
    {
      id: "S3",
      name: "Cooling Water Inlet",
      temperature: row.cooling_temperature,
      pressure: row.cooling_pressure,
      massFlow: row.cooling_flow,
      molarFlow: molarFlow(row.cooling_flow),
      vaporFraction: 0,
      enthalpy: enthalpy(REFERENCE.coolingTemperature, 130.5, row.cooling_temperature),
      density: density(REFERENCE.coolingTemperature, 996.5, row.cooling_temperature),
      composition: row.composition,
    },
    {
      id: "S4",
      name: "Cold Outlet",
      temperature: coldOutT,
      pressure: coldOutP,
      massFlow: row.cooling_flow,
      molarFlow: molarFlow(row.cooling_flow),
      vaporFraction: 0,
      enthalpy: enthalpy(REFERENCE.coldOutletTemperature, 141.0, coldOutT),
      density: density(REFERENCE.coldOutletTemperature, 995.9, coldOutT),
      composition: row.composition,
    },
  ];
}

function shape(t: number, power: number) {
  return t ** power;
}

export function temperatureProfile(
  hotIn: number,
  hotOut: number,
  coldIn: number,
  coldOut: number,
): ProfilePoint[] {
  return Array.from({ length: 11 }, (_, index) => {
    const x = index / 10;
    return {
      x: round(x, 1),
      hot: round(hotIn + (hotOut - hotIn) * shape(x, 0.92), 2),
      cold: round(coldIn + (coldOut - coldIn) * shape(x, 1.05), 2),
    };
  });
}

export function enthalpyProfile(streams: StreamColumn[]): ProfilePoint[] {
  const hotIn = streams[0]?.enthalpy ?? 0;
  const hotOut = streams[1]?.enthalpy ?? 0;
  const coldIn = streams[2]?.enthalpy ?? 0;
  const coldOut = streams[3]?.enthalpy ?? 0;
  return Array.from({ length: 11 }, (_, index) => {
    const x = index / 10;
    return {
      x: round(x, 1),
      hot: round(hotIn + (hotOut - hotIn) * shape(x, 0.92), 2),
      cold: round(coldIn + (coldOut - coldIn) * shape(x, 1.05), 2),
    };
  });
}

export function convergenceSeries(): ConvergencePoint[] {
  return Array.from({ length: 12 }, (_, index) => ({
    iteration: index + 1,
    residual: Math.max(1e-6, 1.35 * Math.exp(-0.62 * index)),
  }));
}
