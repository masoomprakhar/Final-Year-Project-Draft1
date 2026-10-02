import { round } from "@/lib/format";
import { REFERENCE, runMock } from "@/lib/simulation/mockHeatExchanger";
import type { PlantRow } from "@/lib/types";

export const REQUIRED_COLUMNS = [
  "timestamp",
  "hot_flow",
  "hot_temperature",
  "hot_pressure",
  "cooling_flow",
  "cooling_temperature",
  "cooling_pressure",
  "composition",
] as const;

export const CSV_COLUMNS = [
  ...REQUIRED_COLUMNS,
  "hot_outlet_spec",
  "hot_outlet_actual",
  "cold_outlet_actual",
  "hot_outlet_pressure_actual",
  "cold_outlet_pressure_actual",
] as const;

export type ParseResult = {
  rows: PlantRow[];
  errors: string[];
  inferredActuals: boolean;
};

function splitCsvLine(line: string) {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (character === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
    } else {
      current += character;
    }
  }

  cells.push(current.trim());
  return cells;
}

function parseNumber(value: string) {
  if (value.trim() === "") return Number.NaN;
  return Number(value);
}

export function rowsToCsv(rows: PlantRow[]) {
  const header = CSV_COLUMNS.join(",");
  const body = rows
    .map((row) => CSV_COLUMNS.map((column) => row[column]).join(","))
    .join("\n");
  return `${header}\n${body}\n`;
}

export function parsePlantCsv(text: string): ParseResult {
  const errors: string[] = [];
  const source = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = source
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    return { rows: [], errors: ["The file is empty."], inferredActuals: false };
  }

  const header = splitCsvLine(lines[0]).map((cell) => cell.toLowerCase());
  const missing = REQUIRED_COLUMNS.filter((column) => !header.includes(column));
  if (missing.length > 0) {
    return {
      rows: [],
      errors: [`Missing required columns: ${missing.join(", ")}.`],
      inferredActuals: false,
    };
  }

  const indexOf = (column: string) => header.indexOf(column);
  const rows: PlantRow[] = [];
  let inferredActuals = false;
  const seen = new Set<string>();

  for (let lineIndex = 1; lineIndex < lines.length; lineIndex += 1) {
    const cells = splitCsvLine(lines[lineIndex]);
    const rowNumber = lineIndex + 1;
    const read = (column: string) => cells[indexOf(column)] ?? "";
    const timestamp = read("timestamp");
    if (!timestamp) {
      errors.push(`Row ${rowNumber}: timestamp is blank.`);
      continue;
    }

    const numericFields = [
      "hot_flow",
      "hot_temperature",
      "hot_pressure",
      "cooling_flow",
      "cooling_temperature",
      "cooling_pressure",
      "composition",
    ] as const;

    const values: Record<(typeof numericFields)[number], number> = {
      hot_flow: Number.NaN,
      hot_temperature: Number.NaN,
      hot_pressure: Number.NaN,
      cooling_flow: Number.NaN,
      cooling_temperature: Number.NaN,
      cooling_pressure: Number.NaN,
      composition: Number.NaN,
    };

    let rowFailed = false;
    for (const field of numericFields) {
      const parsed = parseNumber(read(field));
      if (!Number.isFinite(parsed)) {
        errors.push(`Row ${rowNumber}: ${field} is missing or not a number.`);
        rowFailed = true;
      }
      values[field] = parsed;
    }
    if (rowFailed) continue;

    if (values.hot_flow <= 0 || values.cooling_flow <= 0) {
      errors.push(`Row ${rowNumber}: flows must be greater than zero.`);
      continue;
    }
    if (values.composition < 0 || values.composition > 1) {
      errors.push(`Row ${rowNumber}: composition must be between 0 and 1.`);
      continue;
    }

    const specText = indexOf("hot_outlet_spec") >= 0 ? read("hot_outlet_spec") : "";
    let hotOutletSpec = parseNumber(specText);
    if (!Number.isFinite(hotOutletSpec)) {
      hotOutletSpec = round(
        REFERENCE.hotOutletTemperature +
          (values.hot_temperature - REFERENCE.hotTemperature) * 0.35,
        1,
      );
    }
    if (hotOutletSpec >= values.hot_temperature) {
      errors.push(
        `Row ${rowNumber}: hot outlet specification must be below the hot inlet temperature.`,
      );
      continue;
    }

    const simulated = runMock({
      hot_flow: values.hot_flow,
      hot_temperature: values.hot_temperature,
      hot_pressure: values.hot_pressure,
      cooling_flow: values.cooling_flow,
      cooling_temperature: values.cooling_temperature,
      cooling_pressure: values.cooling_pressure,
      composition: values.composition,
      hot_outlet_temperature_spec: hotOutletSpec,
      pressure_drop_hot_spec: REFERENCE.pressureDropHotSpec,
      pressure_drop_cold_spec: REFERENCE.pressureDropColdSpec,
    });

    if (simulated.status === "Failed") {
      errors.push(`Row ${rowNumber}: ${simulated.error_message}`);
      continue;
    }

    const optional = (
      column: string,
      fallback: number,
    ) => {
      if (indexOf(column) < 0 || read(column) === "") {
        inferredActuals = true;
        return fallback;
      }
      const parsed = parseNumber(read(column));
      if (!Number.isFinite(parsed)) {
        errors.push(`Row ${rowNumber}: ${column} is not a number.`);
        return null;
      }
      return parsed;
    };

    const hotOutletActual = optional("hot_outlet_actual", simulated.hot_outlet_temperature);
    const coldOutletActual = optional("cold_outlet_actual", simulated.cold_outlet_temperature);
    const hotOutletPressure = optional(
      "hot_outlet_pressure_actual",
      simulated.hot_outlet_pressure,
    );
    const coldOutletPressure = optional(
      "cold_outlet_pressure_actual",
      simulated.cold_outlet_pressure,
    );
    if (
      hotOutletActual === null ||
      coldOutletActual === null ||
      hotOutletPressure === null ||
      coldOutletPressure === null
    ) {
      continue;
    }

    let id = `upload-${timestamp}`;
    if (seen.has(id)) id = `${id}-${rowNumber}`;
    seen.add(id);

    rows.push({
      id,
      timestamp,
      hot_flow: values.hot_flow,
      hot_temperature: values.hot_temperature,
      hot_pressure: values.hot_pressure,
      cooling_flow: values.cooling_flow,
      cooling_temperature: values.cooling_temperature,
      cooling_pressure: values.cooling_pressure,
      composition: values.composition,
      hot_outlet_spec: round(hotOutletSpec, 1),
      hot_outlet_actual: hotOutletActual,
      cold_outlet_actual: coldOutletActual,
      hot_outlet_pressure_actual: hotOutletPressure,
      cold_outlet_pressure_actual: coldOutletPressure,
    });
  }

  if (rows.length === 0 && errors.length === 0) {
    errors.push("No data rows were found.");
  }

  return { rows, errors, inferredActuals };
}
