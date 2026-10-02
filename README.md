# Simcourt: Development of Digital Twin Framework for Process Monitoring and Simulation

Browser MVP of a heat-exchanger digital twin. The window matches a process-simulation flowsheet: object palette, PFD, properties, stream table, and temperature profile. Plant rows, the heat-exchanger solve, and the ML scores all live in the browser. There is no backend.

## Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The flowsheet opens on the reference case, `2026-04-12 12:00`:

- Hot feed 40 kg/h, 35.2 °C, 2.1 bar, outlet 28.4 °C
- Cooling water 850 kg/h, 31.2 °C, 1.8 bar, outlet 33.6 °C
- Heat duty 125.3 kW

That duty is the case-study value. It is not recomputed from 40 kg/h and the heat capacity of water, because that balance does not produce 125.3 kW. Other rows scale from this reference.

## What you can do

- **Run Simulation** solves the selected timestamp with the mock heat exchanger and refreshes the streams, properties, and charts.
- **Stop** cancels a run that is still queued or running.
- **Simulation → Run Digital Twin** solves the row, scores the demo ML prediction, and classifies deviations as NORMAL, WARNING, or ANOMALY.
- **File → Upload Plant CSV** parses a file in the browser. Required columns: `timestamp`, `hot_flow`, `hot_temperature`, `hot_pressure`, `cooling_flow`, `cooling_temperature`, `cooling_pressure`, `composition`.
- **File → Load Sample Data** restores the bundled 24-row set.
- **Stream Table, Results, Energy Analysis, Sensitivity, and Data Fit** open the matching panel. Add Unit, Add Stream, Connect, Auto-Layout, and Optimization report that this flowsheet is fixed.

The ribbon status says **Mock physics**. These numbers are not a DWSIM run.

## Sample data

`data/sample_plant_data.csv` is the same 24-hour set the app loads on startup. Regenerate it with:

```bash
npx tsx scripts/write-sample-csv.ts
```

Hours 07:00, 15:00, and 21:00 contain planted deviations so the anomaly table is not all NORMAL. The 12:00 row matches the flowsheet reference case.

## Where a backend replaces this

Keep the UI. Swap the client modules when the API exists:

| Module | Replace with |
| --- | --- |
| `lib/data/samplePlantData.ts` | Plant-data API and database rows |
| `lib/csv/parsePlantCsv.ts` | Server-side CSV validation |
| `lib/simulation/mockHeatExchanger.ts` | DWSIM (or another physics solver) behind the same input and output fields |
| `lib/ml/mockModel.ts` | Trained model metrics, predictions, and anomaly scores |
| `lib/store/TwinProvider.tsx` | Calls to those APIs, with the same screen state |

`runMock` already returns `mode: "mock"` plus the outlet temperatures, pressures, heat duty, LMTD, Reynolds numbers, and pressure drops. A later solver can return that same object.
