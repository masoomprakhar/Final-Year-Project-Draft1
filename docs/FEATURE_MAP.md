# Feature map

Generated from `lib/featureMap.ts` (`npm run docs:map`). **Live** = real behaviour; **Mock** = working UI with placeholder data or physics; **Planned** = not built.

| Area | Feature | Status | Page | Code | Note |
|---|---|---|---|---|---|
| Workbench | Heat-exchanger flowsheet (plant-row twin) | Mock | / | `components/flowsheet, lib/simulation` | Mock physics calibrated to one reference case. |
| Workbench | Unit views (heater, cooler, mixer, reactor…) | Mock | / | `lib/data/unitModels.ts` | Closed-form placeholder models. |
| Workbench | Editable flowsheets (add, connect, layout, run) | Live | / | `lib/flowsheet, components/flowsheet/FlowsheetEditor.tsx` | Sequential-modular solve; recycle loops reported, not solved. |
| Workbench | Sensitivity, charts, anomaly table | Mock | / | `components/bottom` | Computed in the browser from mock physics. |
| Data | CSV upload, validation, Storage | Live | /datasets | `lib/csv, twin-api ingest` | Private per-user bucket. |
| Data | Datasets, runs, alerts storage | Live | /runs | `supabase/migrations` | Postgres with row-level security. |
| Accounts | Email sign-in, per-user isolation | Live | — | `Supabase Auth + RLS` | Local-first when signed out. |
| Monitoring | Run health and alerts, realtime | Live | /monitoring | `subscribeMonitoring` | Alerts raised from demo ML deviations. |
| ML | Model registry and swap-in | Live | /models | `lib/ml/registry.ts` | Register an https endpoint. |
| ML | Prediction model | Mock | /models | `lib/ml/mockModel.ts` | Placeholder until your trained model is registered. |
| Analysis | Dashboard overview | Mock | /dashboard | `app/(app)/dashboard` | Live counts when signed in; trend is mock. |
| Analysis | Dynamic simulation (step tests) | Mock | /dynamics | `lib/dynamics.ts` | First-order response around mock steady states. |
| Analysis | Optimization (cooling flow vs spec) | Mock | /optimization | `lib/optimization.ts` | Grid search over mock physics with a cost model. |
| Analysis | Thermodynamics (water properties) | Mock | /thermo | `lib/thermo.ts` | Correlations, not a property package. |
| Analysis | Reports and export | Live | /reports | `app/(app)/reports` | CSV download and print to PDF. |
| Platform | Integrations and health checks | Live | /integrations | `app/(app)/integrations` | Pings the deployed Edge Functions. |
| Platform | Rate limits, CI, Vercel deploy guide | Live | — | `migration 0004, .github, docs/DEPLOY.md` |  |
| Engines | DWSIM solver service | Planned | /integrations | `docs/DWSIM_INTEGRATION.md` | Set DWSIM_API_URL on twin-api once the service exists. |
| Engines | Recycle-loop convergence | Planned | — | `lib/flowsheet/flowsheetSolver.ts` | Currently reported as an error. |
| Engines | Trained ML model | Planned | /models | `ML_API_URL` | You supply the model. |
