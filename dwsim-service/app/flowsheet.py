from __future__ import annotations

from collections import deque

from .engines import Engine
from .models import Conditions, FlowsheetRequest, UnitRequest

# Inlet/outlet counts per unit type (kept in step with lib/flowsheet/flowsheetCatalog.ts).
INLETS = {"mixer": 2, "exchanger": 2}
OUTLETS = {"splitter": 2, "column": 2, "flash": 2, "separator": 2, "exchanger": 2}


def solve_flowsheet(engine: Engine, req: FlowsheetRequest) -> dict:
    """Sequential-modular solve in dependency order; each unit goes to the engine. Same output shape
    as FlowsheetSolution in lib/flowsheet/flowsheetTypes.ts."""
    ids = {u.id for u in req.units}
    errors: list[str] = []
    warnings: list[str] = []
    solved: dict[str, dict] = {}
    outcomes: dict[str, dict] = {}
    inbound: dict[str, dict[int, str]] = {u.id: {} for u in req.units}
    outbound: dict[str, dict[int, str]] = {u.id: {} for u in req.units}
    deps: dict[str, set[str]] = {u.id: set() for u in req.units}
    by_stream = {s.id: s for s in req.streams}
    for s in req.streams:
        src = s.fromUnitId if s.fromUnitId in ids else None
        dst = s.toUnitId if s.toUnitId in ids else None
        if dst:
            inbound[dst][s.toPort] = s.id
        if src:
            outbound[src][s.fromPort] = s.id
        if src and dst:
            deps[dst].add(src)
        if not src:
            solved[s.id] = {"flow": s.flow, "temperature": s.temperature, "pressure": s.pressure, "vaporFraction": 0.0}

    order: list[str] = []
    waiting = {k: set(v) for k, v in deps.items()}
    ready = deque(k for k, v in waiting.items() if not v)
    while ready:
        uid = ready.popleft()
        order.append(uid)
        for other, w in waiting.items():
            if uid in w:
                w.discard(uid)
                if not w and other not in order and other not in ready:
                    ready.append(other)
    if len(order) < len(req.units):
        loop = [u.tag for u in req.units if u.id not in order]
        errors.append(f"Recycle loop through {', '.join(loop)}. Loops are not solved yet; remove one connection.")
        for u in req.units:
            if u.id not in order:
                outcomes[u.id] = {"status": "error", "messages": ["Part of a recycle loop."], "results": []}

    units = {u.id: u for u in req.units}
    for uid in order:
        u = units[uid]
        inlets: list[Conditions] = []
        blocked = False
        for port in range(INLETS.get(u.type, 1)):
            sid = inbound[uid].get(port)
            if sid and sid in solved:
                c = solved[sid]
                inlets.append(Conditions(flow=c["flow"], temperature=c["temperature"], pressure=c["pressure"]))
            else:
                blocked = True
                warnings.append(f"{u.tag}: inlet {port + 1} is not connected to a solved stream.")
        if blocked:
            outcomes[uid] = {"status": "error", "messages": ["Missing inlet stream."], "results": []}
            errors.append(f"{u.tag} was not solved: missing inlet stream.")
            continue
        res = engine.unit(UnitRequest(type=u.type, specs=u.specs, inlets=inlets))
        outcomes[uid] = {"status": res.status, "messages": res.messages,
                         "results": [r.model_dump() for r in res.results]}
        if res.status == "error":
            errors.append(f"{u.tag}: {' '.join(res.messages)}")
            continue
        for port, sid in outbound[uid].items():
            if port < len(res.outlets):
                solved[sid] = res.outlets[port].model_dump()
            else:
                errors.append(f"{by_stream[sid].tag} leaves {u.tag} port {port + 1}, which does not exist.")
    return {"ok": not errors, "errors": errors, "warnings": warnings, "streams": solved, "units": outcomes, "order": order}
