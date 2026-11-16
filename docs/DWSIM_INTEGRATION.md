# DWSIM integration map

Goal: replace the mock heat-exchanger solver with the open-source DWSIM engine without changing the UI,
the database, or the Edge Function actions.

## What DWSIM offers (checked against dwsim.org, sourceforge.net and github.com/DanWBR/dwsim)

| Option | What it is | Fit |
| --- | --- | --- |
| **Automation API** (`DWSIM.Automation.dll`) | .NET library in the DWSIM repo for creating, loading, modifying, running and saving flowsheets without the UI. Callable from .NET, or from Python through pythonnet. | **Recommended.** Direct control of a saved `.dwxmz` flowsheet. |
| **DWSIM MCP Server (Headless)** | Official headless engine exposed over the Model Context Protocol. Docker image, Debian service or portable tarball; listens on port 5901, no token by default; GPL-3. Version 10.2.12 at the time of writing. | Good second option. The download page does not list its tools, so connect and list them before relying on it. |
| **DTL, DWSIM Thermo Library** | Standalone thermodynamics DLL (properties only, no flowsheet). | Useful for property checks, not for the exchanger. |
| `dwsimopt` (PyPI) | Community Python wrapper aimed at optimisation. Targets DWSIM v7, depends on pywin32 and pinned pythonnet. | Not recommended: old, Windows-oriented. |

Known risk: running the Automation API on Linux through pythonnet/Mono has crashed for some users
(see the SourceForge thread on `Automation()` NullReferenceException). Prefer a current .NET runtime in a
Docker image and test it before committing to it.

## Where it runs

Supabase Edge Functions run Deno and cannot host DWSIM. DWSIM therefore runs as a small separate service
(Docker, any host). That is a later phase, as agreed; the seam is already in place:

```
Browser -> Edge Function twin-api?action=simulate
             -> selectEngine():  DWSIM_API_URL unset -> mock (lib/simulation)
                                 DWSIM_API_URL set   -> POST {DWSIM_API_URL}/solve/heat-exchanger
                                                         -> DWSIM Automation API -> flowsheet.dwxmz
```

Set `DWSIM_API_URL` (and optionally `DWSIM_API_TOKEN`) as Edge Function secrets. Nothing else changes: runs
are stored with `engine = 'dwsim'`, and the UI can label results by that column.

## Service contract

`POST /solve/heat-exchanger`, body = `SimulationInput`, response = `SimulationOutput`
(both defined in `lib/simulation/mockHeatExchanger.ts` and `lib/types.ts`). Return `status: "Failed"` with an
`error_message` when the flowsheet does not converge; do not return mock numbers.

| App field (input) | DWSIM side | Unit conversion |
| --- | --- | --- |
| `hot_flow` | Hot feed material stream, mass flow | kg/h to the stream's unit |
| `hot_temperature`, `hot_pressure` | Hot feed temperature, pressure | °C to K, bar to Pa if DWSIM is in SI |
| `cooling_flow`, `cooling_temperature`, `cooling_pressure` | Cooling-water feed stream | same |
| `composition` | Feed composition (mass fraction of water) | none |
| `hot_outlet_temperature_spec` | Heat-exchanger calculation mode "outlet temperature" | °C to K |
| `heat_duty_spec`, `u`, `area`, `calculation_type` | Heat-exchanger calculation mode, U, area | kW to W as needed |
| `pressure_drop_hot_spec`, `pressure_drop_cold_spec` | Exchanger pressure drops | bar to Pa |

| App field (output) | DWSIM side |
| --- | --- |
| `hot_outlet_temperature`, `hot_outlet_pressure` | Hot outlet stream (S2) |
| `cold_outlet_temperature`, `cold_outlet_pressure` | Cold outlet stream (S4) |
| `heat_duty` | Exchanger duty, reported in kW |
| `lmtd`, `pressure_drop_*` | Exchanger results |
| `reynolds_hot`, `reynolds_cold` | Not guaranteed by a shortcut exchanger model; compute from stream properties or return null |

The exact DWSIM property and method names must be confirmed against the Automation API reference at
dwsim.org/api_help when the service is written; this table maps meaning, not code.

## Build order

1. Build `heat_exchanger.dwxmz` in the DWSIM desktop app (water, hot feed S1, cooling water S3, exchanger E-1) and check it reproduces the reference case: 125.3 kW, 28.4 °C hot outlet, 33.6 °C cold outlet.
2. Wrap it in a small service with the contract above (Docker). Add a token.
3. Put the service URL and token in Edge Function secrets and redeploy `twin-api`.
4. Run the 24 sample rows through both engines and compare before switching the default.
5. Keep the mock engine as the fallback for local development and tests.


## Status: service built (stub engine)

`dwsim-service/` now implements the contract above plus `/solve/unit`, `/solve/flowsheet` and `/health`. The default
engine is a stub that mirrors the mock physics so the whole path can be tested; the DWSIM engine is written but
**not yet verified against a real DWSIM install**. `twin-api` (exchanger) and `flowsheet-api` (whole flowsheets)
forward to it when `DWSIM_API_URL` is set. The Dashboard shows which features DWSIM covers and whether the service is
reachable and real. Coverage list: `lib/dwsim/coverage.ts`.
