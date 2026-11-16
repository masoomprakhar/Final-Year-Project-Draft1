"""Engines behind the API. `StubEngine` needs nothing installed and mirrors the app's mock physics,
so the contract can be tested anywhere. `DwsimEngine` drives the real DWSIM Automation API."""
from __future__ import annotations

import math
import os
from typing import Protocol

from .models import (
    Conditions, HeatExchangerInput, HeatExchangerOutput, OutletState, ResultField, UnitRequest, UnitResponse,
)

# Reference case the mock physics is calibrated to (lib/simulation/mockHeatExchanger.ts).
REF = dict(hot_flow=40, hot_t=35.2, cool_t=31.2, duty=125.3, hot_dt=6.8, cold_dt=2.4, cool_flow=850,
           lmtd=4.8, re_hot=5620, re_cold=18450, dp_hot=0.08, dp_cold=0.09, dp_hot_spec=0.1, dp_cold_spec=0.1,
           u=500, area=50)


def _r(value: float, digits: int) -> float:
    return round(value + 1e-12, digits)


class Engine(Protocol):
    name: str
    def heat_exchanger(self, i: HeatExchangerInput) -> HeatExchangerOutput: ...
    def unit(self, req: UnitRequest) -> UnitResponse: ...


def _failed(message: str) -> HeatExchangerOutput:
    return HeatExchangerOutput(
        hot_outlet_temperature=None, cold_outlet_temperature=None, hot_outlet_pressure=None,
        cold_outlet_pressure=None, heat_duty=None, lmtd=None, reynolds_hot=None, reynolds_cold=None,
        pressure_drop_hot=None, pressure_drop_cold=None, status="Failed", error_message=message,
    )


class StubEngine:
    name = "stub"

    def heat_exchanger(self, i: HeatExchangerInput) -> HeatExchangerOutput:
        if i.hot_flow <= 0 or i.cooling_flow <= 0:
            return _failed("Hot flow and cooling flow must both be greater than zero.")
        if i.hot_pressure <= 0 or i.cooling_pressure <= 0:
            return _failed("Inlet pressures must be greater than zero.")
        if not 0 <= i.composition <= 1:
            return _failed("Composition must be a mass fraction from 0 to 1.")
        if i.calculation_type == "Specify Outlet Temperature":
            if i.hot_outlet_temperature_spec >= i.hot_temperature:
                return _failed("Hot outlet temperature must be below the hot inlet when the outlet is specified.")
            hot_drop = i.hot_temperature - i.hot_outlet_temperature_spec
            duty = _r(REF["duty"] * (i.hot_flow / REF["hot_flow"]) * (hot_drop / REF["hot_dt"]), 1)
            hot_out = _r(i.hot_outlet_temperature_spec, 1)
        else:
            duty = i.heat_duty_spec
            if i.calculation_type == "Specify Area":
                driving = (i.hot_temperature - i.cooling_temperature) / (REF["hot_t"] - REF["cool_t"])
                if i.u <= 0 or i.area <= 0 or driving <= 0:
                    return _failed("U, area and the hot-cold temperature difference must be positive.")
                duty = REF["duty"] * (i.u / REF["u"]) * (i.area / REF["area"]) * driving
            if not duty > 0:
                return _failed("Heat duty must be greater than zero.")
            hot_drop = REF["hot_dt"] * (duty / REF["duty"]) * (REF["hot_flow"] / i.hot_flow)
            hot_out = _r(i.hot_temperature - hot_drop, 1)
            duty = _r(duty, 1)
            if hot_out >= i.hot_temperature:
                return _failed("That duty is too large for the hot-stream flow.")
        cold_rise = REF["cold_dt"] * (duty / REF["duty"]) * (REF["cool_flow"] / i.cooling_flow)
        hf, cf = i.hot_flow / REF["hot_flow"], i.cooling_flow / REF["cool_flow"]
        dp_hot = _r(REF["dp_hot"] * (i.pressure_drop_hot_spec / REF["dp_hot_spec"]) * hf ** 1.8, 2)
        dp_cold = _r(REF["dp_cold"] * (i.pressure_drop_cold_spec / REF["dp_cold_spec"]) * cf ** 1.8, 2)
        return HeatExchangerOutput(
            hot_outlet_temperature=hot_out,
            cold_outlet_temperature=_r(i.cooling_temperature + cold_rise, 1),
            hot_outlet_pressure=_r(i.hot_pressure - dp_hot, 1),
            cold_outlet_pressure=_r(i.cooling_pressure - dp_cold, 1),
            heat_duty=duty,
            lmtd=_r(REF["lmtd"] * (hot_drop / REF["hot_dt"] + abs(cold_rise) / REF["cold_dt"]) / 2, 1),
            reynolds_hot=float(round(REF["re_hot"] * hf)), reynolds_cold=float(round(REF["re_cold"] * cf)),
            pressure_drop_hot=dp_hot, pressure_drop_cold=dp_cold, status="Converged", error_message="",
        )

    def unit(self, req: UnitRequest) -> UnitResponse:
        s, ins = req.specs, req.inlets
        need = {"mixer": 2, "exchanger": 2}.get(req.type, 1)
        if len(ins) < need:
            return UnitResponse(status="error", messages=[f"{req.type} needs {need} inlet(s)."])
        a = ins[0]
        cp = 4.18  # kJ/kg/K, water
        t = req.type
        if t == "heater" or t == "cooler":
            duty = s.get("duty", 50.0)
            sign = 1 if t == "heater" else -1
            dt = sign * duty * 3600 / (max(a.flow, 1e-9) * cp)
            out = OutletState(flow=a.flow, temperature=_r(a.temperature + dt, 2), pressure=_r(a.pressure - s.get("dp", 0.1), 2))
            return UnitResponse(status="ok", outlets=[out], results=[ResultField(label="Duty", value=duty, unit="kW")])
        if t == "pump":
            dp, eff = s.get("dp", 3.0), min(1.0, max(0.2, s.get("eff", 0.7)))
            power = a.flow * dp / (36 * eff) / 1000
            out = OutletState(flow=a.flow, temperature=_r(a.temperature + dp * 0.02, 2), pressure=_r(a.pressure + dp, 2))
            return UnitResponse(status="ok", outlets=[out], results=[ResultField(label="Power", value=_r(power, 3), unit="kW", digits=3)])
        if t == "valve":
            out = OutletState(flow=a.flow, temperature=a.temperature, pressure=_r(max(a.pressure - s.get("dp", 1.0), 0.01), 2))
            return UnitResponse(status="ok", outlets=[out])
        if t == "mixer":
            b = ins[1]
            flow = a.flow + b.flow
            temp = (a.flow * a.temperature + b.flow * b.temperature) / flow if flow else a.temperature
            out = OutletState(flow=_r(flow, 3), temperature=_r(temp, 2), pressure=min(a.pressure, b.pressure))
            return UnitResponse(status="ok", outlets=[out])
        if t == "splitter":
            f = min(1.0, max(0.0, s.get("split", 0.5)))
            return UnitResponse(status="ok", outlets=[
                OutletState(flow=_r(a.flow * f, 3), temperature=a.temperature, pressure=a.pressure),
                OutletState(flow=_r(a.flow * (1 - f), 3), temperature=a.temperature, pressure=a.pressure)])
        if t == "exchanger":
            res = self.heat_exchanger(HeatExchangerInput(
                hot_flow=a.flow, hot_temperature=a.temperature, hot_pressure=a.pressure,
                cooling_flow=ins[1].flow, cooling_temperature=ins[1].temperature, cooling_pressure=ins[1].pressure,
                composition=1, hot_outlet_temperature_spec=s.get("hotOut", 28.4),
                pressure_drop_hot_spec=s.get("dpHot", 0.1), pressure_drop_cold_spec=s.get("dpCold", 0.1),
                calculation_type="Specify Outlet Temperature", heat_duty_spec=REF["duty"], u=REF["u"], area=REF["area"]))
            if res.status == "Failed":
                return UnitResponse(status="error", messages=[res.error_message])
            return UnitResponse(status="ok", outlets=[
                OutletState(flow=a.flow, temperature=res.hot_outlet_temperature, pressure=res.hot_outlet_pressure),
                OutletState(flow=ins[1].flow, temperature=res.cold_outlet_temperature, pressure=res.cold_outlet_pressure)],
                results=[ResultField(label="Heat duty", value=res.heat_duty, unit="kW")])
        return UnitResponse(status="error", messages=[
            f"The stub engine does not model '{t}'. Run with DWSIM_ENGINE=dwsim for compressors, flash, separators, reactors and columns."])


class DwsimEngine:
    """Drives DWSIM through its Automation API (DWSIM.Automation.dll) via pythonnet.

    UNVERIFIED: written against the public DWSIM Automation documentation but not run against a real
    DWSIM install from this repo's CI. Confirm property names against your DWSIM version (see README)."""
    name = "dwsim"

    def __init__(self) -> None:
        import clr  # type: ignore  # pythonnet

        path = os.environ["DWSIM_PATH"]
        import sys

        sys.path.append(path)
        for dll in ("DWSIM.Automation", "DWSIM.Interfaces", "DWSIM.GlobalSettings", "DWSIM.SharedClasses",
                    "DWSIM.Thermodynamics", "DWSIM.UnitOperations", "DWSIM.Inspector"):
            clr.AddReference(os.path.join(path, dll + ".dll"))
        from DWSIM.Automation import Automation3  # type: ignore
        from DWSIM.Interfaces.Enums.GraphicObjects import ObjectType  # type: ignore

        self._ObjectType = ObjectType
        self._interf = Automation3()

    def _flowsheet(self):
        sim = self._interf.CreateFlowsheet()
        water = sim.AvailableCompounds["Water"]
        sim.SelectedCompounds.Add(water.Name, water)
        sim.CreateAndAddPropertyPackage("Steam Tables (IAPWS-IF97)")
        return sim

    @staticmethod
    def _set_stream(stream, c: Conditions) -> None:
        stream.SetTemperature(c.temperature + 273.15)  # K
        stream.SetPressure(c.pressure * 1e5)  # Pa
        stream.SetMassFlow(c.flow / 3600.0)  # kg/s
        stream.SetOverallCompositionalComposition = None  # pure water
        stream.SetOverallComposition([1.0])

    @staticmethod
    def _read(stream) -> OutletState:
        return OutletState(flow=stream.GetMassFlow() * 3600.0, temperature=stream.GetTemperature() - 273.15,
                           pressure=stream.GetPressure() / 1e5, vaporFraction=stream.GetPhase("Vapor").Properties.molarfraction or 0.0)

    def unit(self, req: UnitRequest) -> UnitResponse:
        OT = self._ObjectType
        kinds = {"heater": OT.Heater, "cooler": OT.Cooler, "pump": OT.Pump, "valve": OT.Valve, "mixer": OT.NodeIn,
                 "splitter": OT.NodeOut, "compressor": OT.Compressor, "flash": OT.Vessel, "separator": OT.Vessel,
                 "exchanger": OT.HeatExchanger}
        if req.type not in kinds:
            return UnitResponse(status="error", messages=[f"'{req.type}' is not wired to DWSIM yet."])
        try:
            sim = self._flowsheet()
            unit = sim.AddObject(kinds[req.type], 100, 100, "unit")
            streams_in = []
            for k, c in enumerate(req.inlets):
                s = sim.AddObject(OT.MaterialStream, 20, 20 + 60 * k, f"in{k}")
                self._set_stream(s, c)
                sim.ConnectObjects(s.GraphicObject, unit.GraphicObject, 0, k)
                streams_in.append(s)
            n_out = {"splitter": 2, "flash": 2, "separator": 2, "exchanger": 2}.get(req.type, 1)
            outs = []
            for k in range(n_out):
                s = sim.AddObject(OT.MaterialStream, 220, 20 + 60 * k, f"out{k}")
                sim.ConnectObjects(unit.GraphicObject, s.GraphicObject, k, 0)
                outs.append(s)
            # Spec mapping (duty, dp, efficiency, split ratio ...) goes here, per unit type.
            if "dp" in req.specs and hasattr(unit, "DeltaP"):
                unit.DeltaP = req.specs["dp"] * 1e5
            errors = self._interf.CalculateFlowsheet2(sim)
            if errors is not None and len(errors) > 0:
                return UnitResponse(status="error", messages=[str(e) for e in errors])
            return UnitResponse(status="ok", outlets=[self._read(s) for s in outs])
        except Exception as exc:  # report, never fake numbers
            return UnitResponse(status="error", messages=[f"DWSIM error: {exc}"])

    def heat_exchanger(self, i: HeatExchangerInput) -> HeatExchangerOutput:
        res = self.unit(UnitRequest(
            type="exchanger",
            specs={"hotOut": i.hot_outlet_temperature_spec, "dpHot": i.pressure_drop_hot_spec, "dpCold": i.pressure_drop_cold_spec},
            inlets=[Conditions(flow=i.hot_flow, temperature=i.hot_temperature, pressure=i.hot_pressure),
                    Conditions(flow=i.cooling_flow, temperature=i.cooling_temperature, pressure=i.cooling_pressure)]))
        if res.status == "error":
            return _failed("; ".join(res.messages))
        hot, cold = res.outlets
        return HeatExchangerOutput(
            hot_outlet_temperature=hot.temperature, cold_outlet_temperature=cold.temperature,
            hot_outlet_pressure=hot.pressure, cold_outlet_pressure=cold.pressure,
            heat_duty=i.cooling_flow / 3600.0 * 4.18 * (cold.temperature - i.cooling_temperature),
            lmtd=None, reynolds_hot=None, reynolds_cold=None,
            pressure_drop_hot=i.hot_pressure - hot.pressure, pressure_drop_cold=i.cooling_pressure - cold.pressure,
            status="Converged", error_message="")


def make_engine() -> Engine:
    return DwsimEngine() if os.environ.get("DWSIM_ENGINE", "stub") == "dwsim" else StubEngine()
