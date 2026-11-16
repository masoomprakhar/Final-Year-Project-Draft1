"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { deleteFlowsheet, loadFlowsheets, saveFlowsheet, solveOnServer } from "@/lib/api/flowsheets";
import { CATALOG, defaultSpecs, nextTag } from "@/lib/flowsheet/flowsheetCatalog";
import { autoLayout as computeLayout } from "@/lib/flowsheet/flowsheetLayout";
import { solveFlowsheet } from "@/lib/flowsheet/flowsheetSolver";
import type { FlowDoc, FlowStream, FlowUnit, FlowsheetSolution, UnitType } from "@/lib/flowsheet/flowsheetTypes";
import { useTwin } from "@/lib/store/TwinProvider";

export type FlowSelection = { kind: "unit" | "stream"; id: string } | null;

type FlowsheetContextValue = {
  docs: FlowDoc[];
  active: FlowDoc | null;
  activeId: string | null;
  selection: FlowSelection;
  connectMode: boolean;
  /** First click of a connection while Connect is on. */
  pending: FlowSelection;
  solution: FlowsheetSolution | null;
  saving: boolean;
  openFlowsheet: (id: string) => void;
  closeFlowsheet: () => void;
  createFlowsheet: () => void;
  removeFlowsheet: (id: string) => void;
  renameFlowsheet: (name: string) => void;
  addUnit: (type: UnitType) => void;
  addStream: () => void;
  select: (selection: FlowSelection) => void;
  clickTarget: (target: NonNullable<FlowSelection>) => void;
  toggleConnect: () => void;
  moveUnit: (id: string, x: number, y: number) => void;
  updateSpec: (unitId: string, key: string, value: number) => void;
  updateStream: (id: string, patch: Partial<Pick<FlowStream, "flow" | "temperature" | "pressure">>) => void;
  detach: (streamId: string, end: "from" | "to") => void;
  deleteSelected: () => void;
  autoLayout: () => void;
  run: () => Promise<void>;
};

const Context = createContext<FlowsheetContextValue | null>(null);
const STORAGE_KEY = "simcourt.flowsheets";

function uid() {
  return crypto.randomUUID();
}

function freePort(doc: FlowDoc, unit: FlowUnit, side: "from" | "to", ignoreStream?: string): number | null {
  const count = side === "from" ? CATALOG[unit.type].outlets : CATALOG[unit.type].inlets;
  const taken = new Set(
    doc.streams
      .filter((s) => s.id !== ignoreStream)
      .filter((s) => (side === "from" ? s.fromUnitId === unit.id : s.toUnitId === unit.id))
      .map((s) => (side === "from" ? s.fromPort : s.toPort)),
  );
  for (let port = 0; port < count; port += 1) if (!taken.has(port)) return port;
  return null;
}

export function FlowsheetProvider({ children }: { children: ReactNode }) {
  const { userId, notify } = useTwin();
  const [docs, setDocs] = useState<FlowDoc[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selection, setSelection] = useState<FlowSelection>(null);
  const [connectMode, setConnectMode] = useState(false);
  const [pending, setPending] = useState<FlowSelection>(null);
  const [solutions, setSolutions] = useState<Record<string, FlowsheetSolution>>({});
  const [saving, setSaving] = useState(false);

  const docsRef = useRef(docs);
  docsRef.current = docs;
  const dirty = useRef(new Set<string>());
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userRef = useRef<string | null>(null);
  userRef.current = userId;

  const active = docs.find((d) => d.id === activeId) ?? null;
  const solution = activeId ? (solutions[activeId] ?? null) : null;

  const flush = useCallback(async () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = null;
    const ids = [...dirty.current];
    dirty.current.clear();
    if (!userRef.current || ids.length === 0) return;
    setSaving(true);
    for (const id of ids) {
      const doc = docsRef.current.find((d) => d.id === id);
      if (!doc) continue;
      const result = await saveFlowsheet(doc);
      if (!result.ok) {
        dirty.current.add(id);
        notify(`Could not save flowsheet "${doc.name}": ${result.error}`, "error");
      }
    }
    setSaving(false);
  }, [notify]);

  /** Applies a change to one document, marks it for saving and drops its stale solution. */
  const edit = useCallback(
    (id: string, change: (doc: FlowDoc) => FlowDoc) => {
      setDocs((current) => current.map((d) => (d.id === id ? change(d) : d)));
      setSolutions((current) => {
        if (!current[id]) return current;
        const { [id]: _stale, ...rest } = current;
        void _stale;
        return rest;
      });
      dirty.current.add(id);
      if (userRef.current) {
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => void flush(), 700);
      } else {
        // Signed out: keep a local copy so a reload does not lose the work.
        setTimeout(() => {
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(docsRef.current));
          } catch {
            /* storage can be unavailable */
          }
        }, 0);
      }
    },
    [flush],
  );

  // Signed in: load saved flowsheets (pushing any local-only ones up first). Signed out: local copy.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let local: FlowDoc[] = [];
      try {
        local = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
      } catch {
        local = [];
      }
      if (!userId) {
        if (!cancelled) setDocs(local);
        return;
      }
      for (const doc of local) await saveFlowsheet(doc);
      if (local.length > 0) localStorage.removeItem(STORAGE_KEY);
      const saved = await loadFlowsheets();
      if (!cancelled) {
        setDocs(saved);
        setActiveId((current) => (saved.some((d) => d.id === current) ? current : null));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const createFlowsheet = useCallback(() => {
    const id = uid();
    const name = `Flowsheet ${docsRef.current.length + 1}`;
    setDocs((current) => [...current, { id, name, units: [], streams: [] }]);
    dirty.current.add(id);
    setActiveId(id);
    setSelection(null);
    setPending(null);
    if (userRef.current) saveTimer.current = setTimeout(() => void flush(), 300);
  }, [flush]);

  const ensureActive = useCallback((): string => {
    if (activeId) return activeId;
    const id = uid();
    setDocs((current) => [...current, { id, name: `Flowsheet ${current.length + 1}`, units: [], streams: [] }]);
    dirty.current.add(id);
    setActiveId(id);
    return id;
  }, [activeId]);

  const openFlowsheet = useCallback((id: string) => {
    setActiveId(id);
    setSelection(null);
    setPending(null);
  }, []);

  const closeFlowsheet = useCallback(() => {
    setActiveId(null);
    setSelection(null);
    setPending(null);
    setConnectMode(false);
  }, []);

  const removeFlowsheet = useCallback(
    (id: string) => {
      setDocs((current) => current.filter((d) => d.id !== id));
      dirty.current.delete(id);
      if (activeId === id) closeFlowsheet();
      if (userRef.current) void deleteFlowsheet(id);
      else setTimeout(() => localStorage.setItem(STORAGE_KEY, JSON.stringify(docsRef.current)), 0);
    },
    [activeId, closeFlowsheet],
  );

  const renameFlowsheet = useCallback(
    (name: string) => {
      if (activeId && name.trim()) edit(activeId, (doc) => ({ ...doc, name: name.trim() }));
    },
    [activeId, edit],
  );

  const addUnit = useCallback(
    (type: UnitType) => {
      const id = ensureActive();
      const entry = CATALOG[type];
      const unitId = uid();
      edit(id, (doc) => {
        const index = doc.units.length;
        const unit: FlowUnit = {
          id: unitId,
          tag: nextTag(entry.tagPrefix, doc.units.map((u) => u.tag)),
          type,
          x: 200 + (index % 5) * 190,
          y: 130 + Math.floor(index / 5) * 130,
          specs: defaultSpecs(type),
        };
        return { ...doc, units: [...doc.units, unit] };
      });
      setSelection({ kind: "unit", id: unitId });
      notify(`${entry.label} added. Drag it into place, then use Connect to link streams.`);
    },
    [edit, ensureActive, notify],
  );

  const addStream = useCallback(() => {
    const id = ensureActive();
    const streamId = uid();
    edit(id, (doc) => {
      const stream: FlowStream = {
        id: streamId,
        tag: nextTag("S", doc.streams.map((s) => s.tag), ""),
        fromUnitId: null,
        fromPort: 0,
        toUnitId: null,
        toPort: 0,
        flow: 40,
        temperature: 35,
        pressure: 2,
      };
      return { ...doc, streams: [...doc.streams, stream] };
    });
    setSelection({ kind: "stream", id: streamId });
    notify("Stream added. Turn on Connect, then click the stream and a unit to attach it.");
  }, [edit, ensureActive, notify]);

  /** Joins what the two clicks refer to: unit→unit makes a stream, stream↔unit attaches an end. */
  const connect = useCallback(
    (a: NonNullable<FlowSelection>, b: NonNullable<FlowSelection>) => {
      if (!activeId) return;
      const doc = docsRef.current.find((d) => d.id === activeId);
      if (!doc) return;
      const unitOf = (id: string) => doc.units.find((u) => u.id === id)!;

      if (a.kind === "unit" && b.kind === "unit") {
        if (a.id === b.id) return notify("A unit cannot feed itself.", "warning");
        const from = unitOf(a.id);
        const to = unitOf(b.id);
        const fromPort = freePort(doc, from, "from");
        const toPort = freePort(doc, to, "to");
        if (fromPort === null) return notify(`${from.tag} has no free outlet.`, "warning");
        if (toPort === null) return notify(`${to.tag} has no free inlet.`, "warning");
        const streamId = uid();
        edit(activeId, (d) => ({
          ...d,
          streams: [
            ...d.streams,
            {
              id: streamId, tag: nextTag("S", d.streams.map((s) => s.tag), ""), fromUnitId: from.id, fromPort,
              toUnitId: to.id, toPort, flow: 40, temperature: 35, pressure: 2,
            },
          ],
        }));
        setSelection({ kind: "stream", id: streamId });
        return notify(`Connected ${from.tag} → ${to.tag}.`, "success");
      }

      if (a.kind === "stream" && b.kind === "stream") return notify("Connect a stream to a unit, not to another stream.", "warning");
      const stream = doc.streams.find((s) => s.id === (a.kind === "stream" ? a.id : b.id))!;
      const unit = unitOf(a.kind === "unit" ? a.id : b.id);
      // Whichever end is still free is the one that gets attached; an empty stream is a feed first.
      const end: "from" | "to" = stream.toUnitId === null ? "to" : stream.fromUnitId === null ? "from" : "to";
      if (stream.toUnitId !== null && stream.fromUnitId !== null) return notify(`${stream.tag} is already connected at both ends.`, "warning");
      const port = freePort(doc, unit, end, stream.id);
      if (port === null) return notify(`${unit.tag} has no free ${end === "to" ? "inlet" : "outlet"}.`, "warning");
      edit(activeId, (d) => ({
        ...d,
        streams: d.streams.map((s) =>
          s.id !== stream.id ? s : end === "to" ? { ...s, toUnitId: unit.id, toPort: port } : { ...s, fromUnitId: unit.id, fromPort: port },
        ),
      }));
      notify(`${stream.tag} ${end === "to" ? "enters" : "leaves"} ${unit.tag}.`, "success");
    },
    [activeId, edit, notify],
  );

  const clickTarget = useCallback(
    (target: NonNullable<FlowSelection>) => {
      setSelection(target);
      if (!connectMode) return;
      if (!pending) {
        setPending(target);
        return;
      }
      if (pending.kind === target.kind && pending.id === target.id) {
        setPending(null);
        return;
      }
      connect(pending, target);
      setPending(null);
    },
    [connect, connectMode, pending],
  );

  const toggleConnect = useCallback(() => {
    notify(connectMode ? "Connect off." : "Connect on: click a unit, then another unit (or a stream) to join them.");
    setConnectMode(!connectMode);
    setPending(null);
  }, [connectMode, notify]);

  const moveUnit = useCallback(
    (id: string, x: number, y: number) => {
      if (activeId) edit(activeId, (doc) => ({ ...doc, units: doc.units.map((u) => (u.id === id ? { ...u, x, y } : u)) }));
    },
    [activeId, edit],
  );

  const updateSpec = useCallback(
    (unitId: string, key: string, value: number) => {
      if (activeId)
        edit(activeId, (doc) => ({
          ...doc,
          units: doc.units.map((u) => (u.id === unitId ? { ...u, specs: { ...u.specs, [key]: value } } : u)),
        }));
    },
    [activeId, edit],
  );

  const updateStream = useCallback<FlowsheetContextValue["updateStream"]>(
    (id, patch) => {
      if (activeId) edit(activeId, (doc) => ({ ...doc, streams: doc.streams.map((s) => (s.id === id ? { ...s, ...patch } : s)) }));
    },
    [activeId, edit],
  );

  const detach = useCallback(
    (streamId: string, end: "from" | "to") => {
      if (!activeId) return;
      edit(activeId, (doc) => ({
        ...doc,
        streams: doc.streams.map((s) =>
          s.id !== streamId ? s : end === "from" ? { ...s, fromUnitId: null, fromPort: 0 } : { ...s, toUnitId: null, toPort: 0 },
        ),
      }));
    },
    [activeId, edit],
  );

  const deleteSelected = useCallback(() => {
    if (!activeId || !selection) return;
    edit(activeId, (doc) =>
      selection.kind === "stream"
        ? { ...doc, streams: doc.streams.filter((s) => s.id !== selection.id) }
        : {
            ...doc,
            units: doc.units.filter((u) => u.id !== selection.id),
            // Streams that touched the unit stay, with that end freed, so the feed data is not lost.
            streams: doc.streams.map((s) => ({
              ...s,
              fromUnitId: s.fromUnitId === selection.id ? null : s.fromUnitId,
              toUnitId: s.toUnitId === selection.id ? null : s.toUnitId,
            })),
          },
    );
    setSelection(null);
  }, [activeId, edit, selection]);

  const autoLayout = useCallback(() => {
    if (!activeId) return;
    edit(activeId, (doc) => {
      const positions = computeLayout(doc.units, doc.streams);
      return { ...doc, units: doc.units.map((u) => ({ ...u, ...(positions[u.id] ?? {}) })) };
    });
    notify("Auto-layout applied.", "success");
  }, [activeId, edit, notify]);

  const run = useCallback(async () => {
    if (!active) return notify("Add units to a flowsheet before running.", "error");
    if (active.units.length === 0) return notify("The flowsheet has no units.", "error");
    const local = solveFlowsheet(active.units, active.streams);
    setSolutions((current) => ({ ...current, [active.id]: local }));
    notify(
      local.ok ? `${active.name} solved (${local.order.length} units).` : `${active.name}: ${local.errors[0]}`,
      local.ok ? "success" : "error",
    );
    for (const warning of local.warnings) notify(warning, "warning");
    if (!userRef.current) return;

    await flush();
    const remote = await solveOnServer(active.id);
    if (!remote.ok) notify(`Server run was not recorded: ${remote.error}`, "warning");
    else notify(`Run saved to Runs (${remote.runId.slice(0, 8)}).`);
  }, [active, flush, notify]);

  const value = useMemo<FlowsheetContextValue>(
    () => ({
      docs, active, activeId, selection, connectMode, pending, solution, saving,
      openFlowsheet, closeFlowsheet, createFlowsheet, removeFlowsheet, renameFlowsheet, addUnit, addStream,
      select: setSelection, clickTarget, toggleConnect, moveUnit, updateSpec, updateStream, detach, deleteSelected,
      autoLayout, run,
    }),
    [
      docs, active, activeId, selection, connectMode, pending, solution, saving, openFlowsheet, closeFlowsheet,
      createFlowsheet, removeFlowsheet, renameFlowsheet, addUnit, addStream, clickTarget, toggleConnect, moveUnit,
      updateSpec, updateStream, detach, deleteSelected, autoLayout, run,
    ],
  );

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useFlowsheets() {
  const value = useContext(Context);
  if (!value) throw new Error("useFlowsheets must be used inside FlowsheetProvider");
  return value;
}
