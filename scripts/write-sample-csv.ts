import { mkdirSync, writeFileSync } from "node:fs";
import { rowsToCsv } from "../lib/csv/parsePlantCsv";
import { BASE_ROW_INDEX, SAMPLE_ROWS } from "../lib/data/samplePlantData";

mkdirSync("data", { recursive: true });
writeFileSync("data/sample_plant_data.csv", rowsToCsv(SAMPLE_ROWS), "utf8");

const base = SAMPLE_ROWS[BASE_ROW_INDEX];
console.log(
  JSON.stringify(
    {
      rows: SAMPLE_ROWS.length,
      timestamp: base.timestamp,
      hot_flow: base.hot_flow,
      hot_temperature: base.hot_temperature,
      hot_pressure: base.hot_pressure,
      cooling_flow: base.cooling_flow,
      cooling_temperature: base.cooling_temperature,
      cooling_pressure: base.cooling_pressure,
      hot_outlet_spec: base.hot_outlet_spec,
      hot_outlet_actual: base.hot_outlet_actual,
      cold_outlet_actual: base.cold_outlet_actual,
    },
    null,
    2,
  ),
);
