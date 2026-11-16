from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

UnitType = Literal[
    "heater", "cooler", "mixer", "splitter", "reactor", "column",
    "compressor", "valve", "flash", "separator", "pump", "exchanger",
]


class HeatExchangerInput(BaseModel):
    """Same fields as SimulationInput in lib/simulation/mockHeatExchanger.ts."""
    hot_flow: float
    hot_temperature: float
    hot_pressure: float
    cooling_flow: float
    cooling_temperature: float
    cooling_pressure: float
    composition: float
    hot_outlet_temperature_spec: float
    pressure_drop_hot_spec: float
    pressure_drop_cold_spec: float
    calculation_type: Literal["Specify Outlet Temperature", "Specify Heat Duty", "Specify Area"]
    heat_duty_spec: float
    u: float
    area: float


class HeatExchangerOutput(BaseModel):
    """Same fields as SimulationOutput in lib/types.ts."""
    hot_outlet_temperature: float | None
    cold_outlet_temperature: float | None
    hot_outlet_pressure: float | None
    cold_outlet_pressure: float | None
    heat_duty: float | None
    lmtd: float | None
    reynolds_hot: float | None
    reynolds_cold: float | None
    pressure_drop_hot: float | None
    pressure_drop_cold: float | None
    status: Literal["Converged", "Failed"]
    error_message: str
    mode: Literal["mock"] = "mock"  # contract field kept for the app; the engine is reported by /health


class Conditions(BaseModel):
    flow: float
    temperature: float
    pressure: float


class OutletState(Conditions):
    vaporFraction: float = 0.0


class ResultField(BaseModel):
    label: str
    value: float
    unit: str
    digits: int = 1


class UnitRequest(BaseModel):
    type: UnitType
    specs: dict[str, float] = Field(default_factory=dict)
    inlets: list[Conditions]


class UnitResponse(BaseModel):
    status: Literal["ok", "error"]
    messages: list[str] = []
    outlets: list[OutletState] = []
    results: list[ResultField] = []


class FlowUnit(BaseModel):
    id: str
    tag: str
    type: UnitType
    specs: dict[str, float] = Field(default_factory=dict)


class FlowStream(BaseModel):
    id: str
    tag: str
    fromUnitId: str | None = None
    fromPort: int = 0
    toUnitId: str | None = None
    toPort: int = 0
    flow: float = 40
    temperature: float = 35
    pressure: float = 2


class FlowsheetRequest(BaseModel):
    units: list[FlowUnit]
    streams: list[FlowStream]
