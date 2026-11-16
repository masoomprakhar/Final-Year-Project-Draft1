from __future__ import annotations

import os

from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .engines import make_engine
from .flowsheet import solve_flowsheet
from .models import FlowsheetRequest, HeatExchangerInput, HeatExchangerOutput, UnitRequest, UnitResponse

app = FastAPI(title="Simcourt DWSIM service", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o for o in os.environ.get("CORS_ORIGINS", "*").split(",") if o],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)
engine = make_engine()

SUPPORTED_UNITS = ["exchanger", "heater", "cooler", "pump", "valve", "mixer", "splitter"]
DWSIM_ONLY_UNITS = ["compressor", "flash", "separator", "reactor", "column"]


def auth(authorization: str | None = Header(default=None)) -> None:
    token = os.environ.get("DWSIM_API_TOKEN")
    if token and authorization != f"Bearer {token}":
        raise HTTPException(status_code=401, detail="Missing or wrong bearer token.")


@app.get("/health")
def health() -> dict:
    return {
        "status": "ok",
        "engine": engine.name,  # "stub" = mock physics; "dwsim" = real DWSIM
        "real_dwsim": engine.name == "dwsim",
        "units": SUPPORTED_UNITS if engine.name == "stub" else SUPPORTED_UNITS + DWSIM_ONLY_UNITS,
    }


@app.post("/solve/heat-exchanger", response_model=HeatExchangerOutput, dependencies=[Depends(auth)])
def solve_heat_exchanger(body: HeatExchangerInput) -> HeatExchangerOutput:
    return engine.heat_exchanger(body)


@app.post("/solve/unit", response_model=UnitResponse, dependencies=[Depends(auth)])
def solve_unit(body: UnitRequest) -> UnitResponse:
    return engine.unit(body)


@app.post("/solve/flowsheet", dependencies=[Depends(auth)])
def solve_flowsheet_route(body: FlowsheetRequest) -> dict:
    return solve_flowsheet(engine, body)
