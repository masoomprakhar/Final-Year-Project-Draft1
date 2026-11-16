from fastapi.testclient import TestClient

from app.main import app

c = TestClient(app)
HX = dict(hot_flow=40, hot_temperature=35.2, hot_pressure=2.1, cooling_flow=850, cooling_temperature=31.2,
          cooling_pressure=1.8, composition=1, hot_outlet_temperature_spec=28.4, pressure_drop_hot_spec=0.1,
          pressure_drop_cold_spec=0.1, calculation_type="Specify Outlet Temperature", heat_duty_spec=125.3, u=500, area=50)


def test_health_reports_engine():
    body = c.get("/health").json()
    assert body["status"] == "ok" and body["engine"] in ("stub", "dwsim")


def test_heat_exchanger_reference_case():
    out = c.post("/solve/heat-exchanger", json=HX).json()
    assert out["status"] == "Converged"
    assert (out["hot_outlet_temperature"], out["cold_outlet_temperature"], out["heat_duty"]) == (28.4, 33.6, 125.3)


def test_heat_exchanger_failure_is_reported_not_faked():
    out = c.post("/solve/heat-exchanger", json={**HX, "hot_outlet_temperature_spec": 50}).json()
    assert out["status"] == "Failed" and out["hot_outlet_temperature"] is None


def test_unit_pump_and_unknown_unit():
    ok = c.post("/solve/unit", json={"type": "pump", "specs": {"dp": 2}, "inlets": [{"flow": 100, "temperature": 30, "pressure": 1}]}).json()
    assert ok["status"] == "ok" and ok["outlets"][0]["pressure"] == 3
    bad = c.post("/solve/unit", json={"type": "column", "inlets": [{"flow": 1, "temperature": 1, "pressure": 1}]}).json()
    assert bad["status"] == "error"


def test_flowsheet_chain_and_recycle():
    units = [{"id": "p", "tag": "P-1", "type": "pump", "specs": {"dp": 2}}, {"id": "v", "tag": "V-1", "type": "valve", "specs": {"dp": 1}}]
    streams = [{"id": "a", "tag": "S1", "toUnitId": "p", "flow": 100, "temperature": 30, "pressure": 1.5},
               {"id": "b", "tag": "S2", "fromUnitId": "p", "toUnitId": "v"}, {"id": "c", "tag": "S3", "fromUnitId": "v"}]
    sol = c.post("/solve/flowsheet", json={"units": units, "streams": streams}).json()
    assert sol["ok"] and sol["streams"]["b"]["pressure"] == 3.5 and sol["streams"]["c"]["pressure"] == 2.5
    loop = c.post("/solve/flowsheet", json={"units": units, "streams": [
        {"id": "x", "tag": "S1", "fromUnitId": "p", "toUnitId": "v"}, {"id": "y", "tag": "S2", "fromUnitId": "v", "toUnitId": "p"}]}).json()
    assert not loop["ok"] and "Recycle loop" in loop["errors"][0]
