# Simcourt DWSIM service

A small FastAPI service that gives the app one HTTP API for DWSIM-backed calculations.

| Endpoint | Purpose |
|---|---|
| `GET /health` | `{engine: "stub" \| "dwsim", real_dwsim, units[]}` (the Dashboard reads this) |
| `POST /solve/heat-exchanger` | Same JSON as `SimulationInput` → `SimulationOutput` (what `twin-api` calls) |
| `POST /solve/unit` | One unit: `{type, specs, inlets[]}` → outlets and results |
| `POST /solve/flowsheet` | `{units, streams}` → `FlowsheetSolution` (what `flowsheet-api` calls) |

Optional bearer auth: set `DWSIM_API_TOKEN`. Set `CORS_ORIGINS` (comma list) to your site's origin in production.

## Run (stub engine, nothing else to install)

```bash
cd dwsim-service
pip install -r requirements.txt
uvicorn app.main:app --port 8100
# tests:  pip install httpx pytest && pytest
```

The stub mirrors the app's mock physics for the exchanger, heater, cooler, pump, valve, mixer and splitter, and
**reports an error** (never invented numbers) for compressor, flash, separator, reactor and column.

## Run with real DWSIM

`DwsimEngine` in `app/engines.py` drives DWSIM's Automation API through pythonnet. It is written from the public
Automation documentation and **has not been run against a real DWSIM install**; expect to adjust property names for
your DWSIM version.

1. Install DWSIM (Windows, or Linux with a current .NET runtime), `pip install pythonnet`.
2. `DWSIM_ENGINE=dwsim DWSIM_PATH="C:\Program Files\DWSIM" uvicorn app.main:app --port 8100`
3. Check `/health` reports `"real_dwsim": true`, then compare `/solve/heat-exchanger` with the stub on the reference case
   (hot out 28.4 °C, cold out 33.6 °C, duty 125.3 kW).

## Connect the app

| Where | Variable |
|---|---|
| Edge Functions (`twin-api`, `flowsheet-api`) | `npx supabase secrets set DWSIM_API_URL=https://… DWSIM_API_TOKEN=…`, then redeploy both |
| Browser (Dashboard badge) | `NEXT_PUBLIC_DWSIM_API_URL=https://…` in `.env.local` / Vercel |

The service must be reachable over https from Supabase; use a host you control (a VM or container platform).
