# Simcourt: what is built and what is left

Audit of the repo plus the Supabase backend added on 2026-11-16.

## Built

| Area | State |
| --- | --- |
| Simulator-style UI | Done. Title bar, menus, ribbon, object palette, flowsheet canvas, properties panel, bottom panel (streams, simulation, charts, messages). One page. |
| Heat-exchanger flowsheet | Done for the fixed reference case (hot feed, cooling water, E-1, S1 to S4). Heater H-1, cooler C-1 and mixer unit views exist as local models. |
| Mock physics | Done. `lib/simulation/mockHeatExchanger.ts`, three calculation modes, input validation, stream table, temperature and enthalpy profiles. Scaled from one case-study point, not a thermodynamic solve. |
| Demo ML and anomaly logic | Done as a formula. `lib/ml/mockModel.ts` offsets the mock result; NORMAL / WARNING / ANOMALY thresholds are real logic. Metrics shown in the UI are fixed demo numbers, not a trained model. |
| CSV parsing and validation | Done. Same module now runs in the browser and in the Edge Function. |
| Sample data | Done. 24 rows with planted deviations at 07:00, 15:00, 21:00. |
| Supabase schema | Done. `datasets`, `plant_data`, `simulation_runs`, `simulation_results`, `ml_predictions`, `alerts`; UUID keys, FKs, indexes, owner-scoped RLS. |
| Auth | Done. Email + password, optional: signed out, the app runs on local sample data. |
| Storage | Done. Private `plant-csv` bucket, files under `<user id>/`, 2 MB limit. |
| Edge Functions | Done. `twin-api` with `ingest-dataset`, `simulate`, `ml-predict`. Logic lives in `lib/`, synced to `supabase/functions/_shared` with `npm run sync:edge`. |
| Realtime | Done. Run status changes and new alerts stream into the Messages panel. |
| Engine seam | Done. `SimulationEngine` interface; set `DWSIM_API_URL` to route solves to a DWSIM service. |

## Left to build

1. **Stored-data views.** The UI shows the loaded dataset only. Missing: a run history table, an alerts list with acknowledge, a dataset switcher, delete dataset. The tables and Realtime already support all of it.
2. **Real flowsheet editing.** Add Unit, Add Stream, Connect, Auto-Layout and Optimization still report that the flowsheet is fixed. Needs a flowsheet model in the database (units, streams, connections) and a canvas that edits it.
3. **Real ML.** Train on stored `plant_data` and `simulation_results`, version models in `ml_predictions.model_version`, replace the formula and the fixed metrics. The `ml-predict` action is the place to swap it in.
4. **Real physics.** Replace the mock with DWSIM (see `docs/DWSIM_INTEGRATION.md`).
5. **Other unit operations in the solver.** Heater, cooler, mixer evaluate locally and are not stored or run server-side.
6. **Multi-page structure.** The app is one screen. Separate pages (datasets, runs, monitoring) would make the Supabase data easier to browse.
7. **Hardening before real users.** Enable leaked-password protection in Supabase Auth, add per-user rate limits on `twin-api`, add tests for the Edge Function handlers, add CI that runs `sync:edge` and fails on drift.
8. **Row editing persistence.** Edits made to a row in the Properties panel are sent with each run but the stored `plant_data` row is not updated.


## Status after Steps 2 and 3

Done: editable flowsheets (units, streams, connections, auto-layout, server-recorded runs), a shared
sequential-modular solver (recycle loops are reported, not solved), ML model registry with a demo
model and an HTTP swap-in, Datasets/Runs/Monitoring/ML Models pages, database rate limits, ownership-checked
RLS, CI, and `docs/DEPLOY.md`.

Still open: recycle-loop convergence, real thermodynamics (DWSIM service, see `DWSIM_INTEGRATION.md`),
a trained ML model behind `ML_API_URL`, dynamic simulation, and end-to-end browser tests.
