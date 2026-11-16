export type FeatureStatus = "Live" | "Mock" | "Planned";

export type Feature = {
  area: string;
  name: string;
  status: FeatureStatus;
  route?: string;
  where: string;
  note: string;
};

/** Single source for the Feature Map page and docs/FEATURE_MAP.md (`npm run docs:map`). */
export const FEATURES: Feature[] = [
  { area: "Workbench", name: "Heat-exchanger flowsheet (plant-row twin)", status: "Mock", route: "/", where: "components/flowsheet, lib/simulation", note: "Mock physics calibrated to one reference case." },
  { area: "Workbench", name: "Unit views (heater, cooler, mixer, reactor…)", status: "Mock", route: "/", where: "lib/data/unitModels.ts", note: "Closed-form placeholder models." },
  { area: "Workbench", name: "Editable flowsheets (add, connect, layout, run)", status: "Live", route: "/", where: "lib/flowsheet, components/flowsheet/FlowsheetEditor.tsx", note: "Sequential-modular solve; recycle loops reported, not solved." },
  { area: "Workbench", name: "Sensitivity, charts, anomaly table", status: "Mock", route: "/", where: "components/bottom", note: "Computed in the browser from mock physics." },
  { area: "Data", name: "CSV upload, validation, Storage", status: "Live", route: "/datasets", where: "lib/csv, twin-api ingest", note: "Private per-user bucket." },
  { area: "Data", name: "Datasets, runs, alerts storage", status: "Live", route: "/runs", where: "supabase/migrations", note: "Postgres with row-level security." },
  { area: "Accounts", name: "Email sign-in, per-user isolation", status: "Live", where: "Supabase Auth + RLS", note: "Local-first when signed out." },
  { area: "Monitoring", name: "Run health and alerts, realtime", status: "Live", route: "/monitoring", where: "subscribeMonitoring", note: "Alerts raised from demo ML deviations." },
  { area: "ML", name: "Model registry and swap-in", status: "Live", route: "/models", where: "lib/ml/registry.ts", note: "Register an https endpoint." },
  { area: "ML", name: "Prediction model", status: "Mock", route: "/models", where: "lib/ml/mockModel.ts", note: "Placeholder until your trained model is registered." },
  { area: "Analysis", name: "Dashboard overview", status: "Mock", route: "/dashboard", where: "app/(app)/dashboard", note: "Live counts when signed in; trend is mock." },
  { area: "Analysis", name: "Dynamic simulation (step tests)", status: "Mock", route: "/dynamics", where: "lib/dynamics.ts", note: "First-order response around mock steady states." },
  { area: "Analysis", name: "Optimization (cooling flow vs spec)", status: "Mock", route: "/optimization", where: "lib/optimization.ts", note: "Grid search over mock physics with a cost model." },
  { area: "Analysis", name: "Thermodynamics (water properties)", status: "Mock", route: "/thermo", where: "lib/thermo.ts", note: "Correlations, not a property package." },
  { area: "Analysis", name: "Reports and export", status: "Live", route: "/reports", where: "app/(app)/reports", note: "CSV download and print to PDF." },
  { area: "Platform", name: "Integrations and health checks", status: "Live", route: "/integrations", where: "app/(app)/integrations", note: "Pings the deployed Edge Functions." },
  { area: "Platform", name: "Rate limits, CI, Vercel deploy guide", status: "Live", where: "migration 0004, .github, docs/DEPLOY.md", note: "" },
  { area: "Engines", name: "DWSIM API service (stub engine)", status: "Mock", route: "/dashboard", where: "dwsim-service/", note: "FastAPI contract + flowsheet solve; the stub mirrors mock physics." },
  { area: "Engines", name: "Real DWSIM calculations", status: "Planned", route: "/dashboard", where: "dwsim-service/app/engines.py (DwsimEngine)", note: "Written, untested against a real DWSIM install." },
  { area: "Engines", name: "Recycle-loop convergence", status: "Planned", where: "lib/flowsheet/flowsheetSolver.ts", note: "Currently reported as an error." },
  { area: "Engines", name: "Trained ML model", status: "Planned", route: "/models", where: "ML_API_URL", note: "You supply the model." },
];
