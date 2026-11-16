"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  acknowledgeAlerts as apiAcknowledgeAlerts,
  deleteDataset,
  fetchDataset,
  listAlerts,
  listDatasets,
  listRuns,
  onUserChange,
  persistRun,
  seedDemoRuns,
  signIn as apiSignIn,
  signOut as apiSignOut,
  signUp as apiSignUp,
  subscribeMonitoring,
  updatePlantRow,
  uploadAndIngest,
  type AlertRow,
  type DatasetInfo,
  type RunRow,
} from "@/lib/api/client";
import { parsePlantCsv, rowsToCsv } from "@/lib/csv/parsePlantCsv";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { DEFAULT_ROW_ID, SAMPLE_ROWS } from "@/lib/data/samplePlantData";
import { defaultUnitSpecs, evaluateUnit, UNIT_IDS, type UnitEvaluation } from "@/lib/data/unitModels";
import { buildAnomalies, predictFromOutput, worstStatus } from "@/lib/ml/mockModel";
import {
  DEFAULT_EQUIPMENT,
  buildStreams,
  inputSignature,
  runMock,
  toSimulationInput,
} from "@/lib/simulation/mockHeatExchanger";
import type {
  AppMessage,
  BottomTab,
  ChartTab,
  EquipmentSpecs,
  MenuId,
  MessageLevel,
  MlPrediction,
  ObjectId,
  PlantRow,
  PropertyTab,
  Selection,
  SimStatus,
  SimulationOutput,
} from "@/lib/types";

export type StoredData = {
  datasets: DatasetInfo[];
  runs: RunRow[];
  alerts: AlertRow[];
  loading: boolean;
};

type SolvedBundle = {
  results: Record<string, SimulationOutput>;
  predictions: Record<string, MlPrediction>;
  signatures: Record<string, string>;
};

type TwinState = {
  rows: PlantRow[];
  selectedId: string;
  equipment: EquipmentSpecs;
  results: Record<string, SimulationOutput>;
  predictions: Record<string, MlPrediction>;
  signatures: Record<string, string>;
  status: SimStatus;
  errorMessage: string;
  messages: AppMessage[];
  selection: Selection;
  bottomTab: BottomTab;
  chartTab: ChartTab;
  propertyTab: PropertyTab;
  menu: MenuId | null;
  uploadOpen: boolean;
  activeUnitId: string | null;
  unitSpecs: Record<string, Record<string, number>>;
};

const INITIAL_MESSAGES: AppMessage[] = [
  {
    id: "m0",
    level: "info",
    time: "12:00:00",
    text: "Loaded 24 sample plant records.",
  },
  {
    id: "m1",
    level: "info",
    time: "12:00:01",
    text: "Mock physics mode is active. Results are calculated in the browser and are not from DWSIM.",
  },
  {
    id: "m2",
    level: "success",
    time: "12:00:02",
    text: "Base case 2026-04-12 12:00 is converged and shown on the flowsheet.",
  },
];

function solveAll(rows: PlantRow[], equipment: EquipmentSpecs): SolvedBundle {
  const results: Record<string, SimulationOutput> = {};
  const predictions: Record<string, MlPrediction> = {};
  const signatures: Record<string, string> = {};

  for (const row of rows) {
    const output = runMock(toSimulationInput(row, equipment));
    results[row.id] = output;
    predictions[row.id] = predictFromOutput(row, output);
    signatures[row.id] = inputSignature(row, equipment);
  }

  return { results, predictions, signatures };
}

function createInitialState(): TwinState {
  const solved = solveAll(SAMPLE_ROWS, DEFAULT_EQUIPMENT);
  return {
    rows: SAMPLE_ROWS,
    selectedId: DEFAULT_ROW_ID,
    equipment: DEFAULT_EQUIPMENT,
    ...solved,
    status: "Converged",
    errorMessage: "",
    messages: INITIAL_MESSAGES,
    selection: { kind: "object", id: "E-1" },
    bottomTab: "streams",
    chartTab: "temperature",
    propertyTab: "specifications",
    menu: null,
    uploadOpen: false,
    activeUnitId: null,
    unitSpecs: defaultUnitSpecs(),
  };
}

let messageSeq = 3;

function makeMessage(level: MessageLevel, text: string): AppMessage {
  messageSeq += 1;
  return {
    id: `m-${messageSeq}`,
    level,
    text,
    time: new Date().toLocaleTimeString("en-GB", { hour12: false }),
  };
}

type TwinContextValue = {
  rows: PlantRow[];
  selectedRow: PlantRow;
  equipment: EquipmentSpecs;
  result: SimulationOutput;
  prediction: MlPrediction;
  streams: ReturnType<typeof buildStreams>;
  anomalies: ReturnType<typeof buildAnomalies>;
  status: SimStatus;
  errorMessage: string;
  messages: AppMessage[];
  selection: Selection;
  bottomTab: BottomTab;
  chartTab: ChartTab;
  propertyTab: PropertyTab;
  menu: MenuId | null;
  uploadOpen: boolean;
  stale: boolean;
  successCount: number;
  failedCount: number;
  results: Record<string, SimulationOutput>;
  predictions: Record<string, MlPrediction>;
  selectObject: (id: ObjectId) => void;
  selectUnavailable: (name: string) => void;
  selectRow: (id: string) => void;
  updateRow: (patch: Partial<PlantRow>) => void;
  updateEquipment: (patch: Partial<EquipmentSpecs>) => void;
  runSimulation: () => void;
  stopSimulation: () => void;
  runDigitalTwin: () => void;
  loadSample: () => void;
  applyUpload: (text: string) => { ok: boolean; errors: string[] };
  setUploadOpen: (open: boolean) => void;
  setBottomTab: (tab: BottomTab) => void;
  setChartTab: (tab: ChartTab) => void;
  setPropertyTab: (tab: PropertyTab) => void;
  setMenu: (menu: MenuId | null) => void;
  showSensitivity: () => void;
  notify: (text: string, level?: MessageLevel) => void;
  activeUnitId: string | null;
  unitView: UnitEvaluation | null;
  openUnit: (id: string) => void;
  openFlowsheet: () => void;
  updateUnitSpec: (key: string, value: number) => void;
  connectActive: () => void;
  autoLayout: () => void;
  optimize: () => void;
  cycleFlowsheet: () => void;
  backendEnabled: boolean;
  userEmail: string | null;
  userId: string | null;
  authOpen: boolean;
  setAuthOpen: (open: boolean) => void;
  signIn: (email: string, password: string) => ReturnType<typeof apiSignIn>;
  signUp: (email: string, password: string) => ReturnType<typeof apiSignUp>;
  signOut: () => Promise<void>;
  stored: StoredData;
  activeDatasetId: string | null;
  openDataset: (id: string) => Promise<void>;
  removeDataset: (id: string) => Promise<void>;
  acknowledgeAlerts: (ids?: string[]) => Promise<void>;
  generateDemoRuns: () => Promise<void>;
  refreshStored: () => Promise<void>;
};

const TwinContext = createContext<TwinContextValue | null>(null);

export function TwinProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<TwinState>(createInitialState);
  const stateRef = useRef(state);
  stateRef.current = state;
  const runToken = useRef(0);
  // Id of the Supabase dataset on screen; null while showing the bundled sample.
  const datasetIdRef = useRef<string | null>(null);
  const userIdRef = useRef<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const backendEnabled = isSupabaseConfigured();
  const [activeDatasetId, setActiveDatasetId] = useState<string | null>(null);
  const [stored, setStored] = useState<StoredData>({ datasets: [], runs: [], alerts: [], loading: false });
  const refreshTimer = useRef<number | null>(null);
  const rowSaveTimer = useRef<number | null>(null);

  const setDataset = useCallback((id: string | null) => {
    datasetIdRef.current = id;
    setActiveDatasetId(id);
  }, []);

  const refreshStored = useCallback(async () => {
    if (!userIdRef.current) {
      setStored({ datasets: [], runs: [], alerts: [], loading: false });
      return;
    }
    setStored((current) => ({ ...current, loading: true }));
    const [datasets, runs, alerts] = await Promise.all([listDatasets(), listRuns(), listAlerts()]);
    if (!userIdRef.current) return;
    setStored({ datasets, runs, alerts, loading: false });
  }, []);

  // Realtime bursts (a bulk insert fires many events) collapse into one refresh.
  const scheduleRefresh = useCallback(() => {
    if (refreshTimer.current) window.clearTimeout(refreshTimer.current);
    refreshTimer.current = window.setTimeout(() => void refreshStored(), 600);
  }, [refreshStored]);

  /** Puts a stored dataset on screen: solves every row locally and selects the 12:00 base case. */
  const showDataset = useCallback(
    (latest: { dataset: DatasetInfo; rows: PlantRow[] }, message: string) => {
      setDataset(latest.dataset.id);
      const solved = solveAll(latest.rows, stateRef.current.equipment);
      const base = latest.rows.find((row) => row.timestamp.endsWith("12:00")) ?? latest.rows[0];
      setState((current) => ({
        ...current,
        rows: latest.rows,
        selectedId: base.id,
        ...solved,
        status: "Converged",
        errorMessage: "",
        messages: [...current.messages, makeMessage("success", message)],
      }));
    },
    [setDataset],
  );
  const timers = useRef<number[]>([]);

  const clearTimers = useCallback(() => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
  }, []);

  const notify = useCallback((text: string, level: MessageLevel = "info") => {
    setState((current) => ({
      ...current,
      messages: [...current.messages, makeMessage(level, text)],
    }));
  }, []);

  const selectObject = useCallback((id: ObjectId) => {
    setState((current) => ({
      ...current,
      activeUnitId: null,
      selection: { kind: "object", id },
      propertyTab: id === "E-1" ? current.propertyTab : "general",
    }));
  }, []);

  const openUnit = useCallback((id: string) => {
    setState((current) => ({
      ...current,
      activeUnitId: id,
      propertyTab: "specifications",
      bottomTab: "streams",
      chartTab: "temperature",
      menu: null,
    }));
  }, []);

  const openFlowsheet = useCallback(() => {
    setState((current) => ({
      ...current,
      activeUnitId: null,
      selection: { kind: "object", id: "E-1" },
      propertyTab: "specifications",
      bottomTab: "streams",
      chartTab: "temperature",
      menu: null,
    }));
  }, []);

  const updateUnitSpec = useCallback((key: string, value: number) => {
    setState((current) => {
      if (!current.activeUnitId) return current;
      const id = current.activeUnitId;
      return {
        ...current,
        unitSpecs: {
          ...current.unitSpecs,
          [id]: { ...current.unitSpecs[id], [key]: value },
        },
      };
    });
  }, []);

  const selectUnavailable = useCallback((name: string) => {
    const match = UNIT_IDS.find((id) => evaluateUnit(id).typeLabel === name || evaluateUnit(id).name === name);
    if (match) {
      openUnit(match);
      return;
    }
    openUnit("heater");
  }, [openUnit]);

  // Auth + data. Signed out, the bundled sample keeps the app fully usable. Signed in, the user's
  // latest dataset is loaded from Postgres (their first sign-in stores the sample via Storage),
  // and run / alert events stream into the Messages panel over Realtime.
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    let stopMonitoring: (() => void) | null = null;
    let generation = 0;

    const stopAuth = onUserChange(async (user) => {
      const mine = (generation += 1);
      stopMonitoring?.();
      stopMonitoring = null;
      userIdRef.current = user?.id ?? null;
      setUserEmail(user?.email ?? null);
      setUserId(user?.id ?? null);
      if (!user) {
        setDataset(null);
        void refreshStored();
        return;
      }

      stopMonitoring = subscribeMonitoring(user.id, (text, level) => {
        setState((current) => ({ ...current, messages: [...current.messages, makeMessage(level, text)] }));
        scheduleRefresh();
      });

      let latest = await fetchDataset();
      if (!latest) {
        const saved = await uploadAndIngest(rowsToCsv(SAMPLE_ROWS), "Sample plant data (2026-04-12)", "sample");
        if (saved.ok) latest = await fetchDataset();
        else {
          setState((current) => ({
            ...current,
            messages: [...current.messages, makeMessage("warning", `Could not store the sample dataset: ${saved.error}`)],
          }));
        }
      }
      if (mine !== generation || !latest || latest.rows.length === 0) return;

      void refreshStored();
      showDataset(latest, `Signed in as ${user.email}. Loaded ${latest.rows.length} rows from "${latest.dataset.name}".`);
    });

    return () => {
      generation += 1;
      stopAuth();
      stopMonitoring?.();
    };
  }, [setDataset, refreshStored, scheduleRefresh, showDataset]);

  const signIn = useCallback((email: string, password: string) => apiSignIn(email, password), []);
  const signUp = useCallback((email: string, password: string) => apiSignUp(email, password), []);
  const signOut = useCallback(async () => {
    await apiSignOut();
    setState((current) => ({
      ...current,
      messages: [...current.messages, makeMessage("info", "Signed out. Changes now stay on this device.")],
    }));
  }, []);

  const selectRow = useCallback((id: string) => {
    setState((current) => ({ ...current, selectedId: id, menu: null }));
  }, []);

  const updateRow = useCallback((patch: Partial<PlantRow>) => {
    setState((current) => ({
      ...current,
      rows: current.rows.map((row) =>
        row.id === current.selectedId ? { ...row, ...patch } : row,
      ),
    }));

    // Save the edited row to Postgres once typing pauses.
    if (!userIdRef.current || !datasetIdRef.current) return;
    const rowId = stateRef.current.selectedId;
    if (rowSaveTimer.current) window.clearTimeout(rowSaveTimer.current);
    rowSaveTimer.current = window.setTimeout(() => {
      const datasetId = datasetIdRef.current;
      const row = stateRef.current.rows.find((candidate) => candidate.id === rowId);
      if (!datasetId || !row) return;
      void updatePlantRow(datasetId, row).then((saved) => {
        if (!saved.ok) {
          setState((current) => ({
            ...current,
            messages: [...current.messages, makeMessage("warning", `Row edit was not saved: ${saved.error}`)],
          }));
        }
      });
    }, 900);
  }, []);

  const updateEquipment = useCallback((patch: Partial<EquipmentSpecs>) => {
    setState((current) => ({
      ...current,
      equipment: { ...current.equipment, ...patch },
    }));
  }, []);

  const finishRun = useCallback(
    (mode: "simulation" | "twin", token: number, row: PlantRow, equipment: EquipmentSpecs) => {
      if (runToken.current !== token) return;
      const output = runMock(toSimulationInput(row, equipment));
      const prediction = predictFromOutput(row, output);

      if (output.status === "Failed") {
        setState((current) => ({
          ...current,
          status: "Failed",
          errorMessage: output.error_message,
          messages: [...current.messages, makeMessage("error", output.error_message)],
          bottomTab: "messages",
        }));
        return;
      }

      // Fire and forget: the Edge Function re-solves the row and stores the run. The UI never waits on it.
      if (userIdRef.current) {
        void persistRun(datasetIdRef.current, row, equipment, mode).then((saved) => {
          if (saved.ok) scheduleRefresh();
          if (!saved.ok) {
            setState((current) => ({
              ...current,
              messages: [...current.messages, makeMessage("warning", `Run was not saved to Supabase: ${saved.error}`)],
            }));
          }
        });
      }

      setState((current) => {
        const nextMessages = [...current.messages];
        let bottomTab = current.bottomTab;
        if (row.composition !== 1) {
          nextMessages.push(
            makeMessage(
              "info",
              "Composition is stored on the row. The mock model still treats the fluid as liquid water.",
            ),
          );
        }
        if (mode === "twin") {
          const status = worstStatus(
            buildAnomalies([row], { [row.id]: output }, { [row.id]: prediction }),
          );
          const level = status === "NORMAL" ? "success" : "warning";
          nextMessages.push(
            makeMessage(
              level,
              `Digital twin finished for ${row.timestamp}. Deviation status: ${status}. Demo ML is labeled separately from mock physics.`,
            ),
          );
          bottomTab = "simulation";
        } else {
          nextMessages.push(
            makeMessage("success", `Mock simulation converged for ${row.timestamp}.`),
          );
        }

        return {
          ...current,
          results: { ...current.results, [row.id]: output },
          predictions: { ...current.predictions, [row.id]: prediction },
          signatures: {
            ...current.signatures,
            [row.id]: inputSignature(row, equipment),
          },
          status: "Converged",
          errorMessage: "",
          messages: nextMessages,
          bottomTab,
        };
      });
    },
    [scheduleRefresh],
  );

  const startRun = useCallback(
    (mode: "simulation" | "twin") => {
      const snapshot = stateRef.current;
      if (snapshot.activeUnitId && mode === "simulation") {
        const view = evaluateUnit(snapshot.activeUnitId, snapshot.unitSpecs[snapshot.activeUnitId] ?? {});
        clearTimers();
        const token = runToken.current + 1;
        runToken.current = token;
        setState((current) => ({
          ...current,
          status: "Queued",
          errorMessage: "",
          menu: null,
          messages: [
            ...current.messages,
            makeMessage("info", `${view.name} ${view.typeLabel} queued.`),
          ],
        }));
        const runningTimer = window.setTimeout(() => {
          if (runToken.current !== token) return;
          setState((current) => ({
            ...current,
            status: "Running",
            messages: [...current.messages, makeMessage("info", `Solving ${view.name} with dummy data.`)],
          }));
        }, 350);
        const doneTimer = window.setTimeout(() => {
          if (runToken.current !== token) return;
          const outlet = view.results[0];
          setState((current) => ({
            ...current,
            status: "Converged",
            errorMessage: "",
            messages: [
              ...current.messages,
              makeMessage(
                "success",
                `${view.name} converged. ${outlet?.label ?? "Result"} ${outlet?.value ?? ""} ${outlet?.unit ?? ""}.`,
              ),
            ],
          }));
        }, 1050);
        timers.current = [runningTimer, doneTimer];
        return;
      }
      const row = snapshot.rows.find((item) => item.id === snapshot.selectedId);
      if (!row) {
        notify("Load plant data before running.", "error");
        return;
      }

      clearTimers();
      const token = runToken.current + 1;
      runToken.current = token;
      const equipment = snapshot.equipment;

      setState((current) => ({
        ...current,
        status: "Queued",
        errorMessage: "",
        menu: null,
        messages: [
          ...current.messages,
          makeMessage(
            "info",
            mode === "twin"
              ? `Digital twin queued for ${row.timestamp}.`
              : `Simulation queued for ${row.timestamp}. Mock physics, not DWSIM.`,
          ),
        ],
      }));

      const runningTimer = window.setTimeout(() => {
        if (runToken.current !== token) return;
        setState((current) => ({
          ...current,
          status: "Running",
          messages: [
            ...current.messages,
            makeMessage(
              "info",
              mode === "twin"
                ? "Validating the selected row and running the mock heat exchanger."
                : "Running the mock heat exchanger.",
            ),
          ],
        }));
      }, 350);

      const doneTimer = window.setTimeout(() => {
        finishRun(mode, token, row, equipment);
      }, 1050);

      timers.current = [runningTimer, doneTimer];
    },
    [clearTimers, finishRun, notify],
  );

  const stopSimulation = useCallback(() => {
    runToken.current += 1;
    clearTimers();
    setState((current) => ({
      ...current,
      status: "Stopped",
      messages: [...current.messages, makeMessage("warning", "Simulation stopped.")],
    }));
  }, [clearTimers]);

  const loadSample = useCallback(() => {
    setDataset(null);
    runToken.current += 1;
    clearTimers();
    const solved = solveAll(SAMPLE_ROWS, DEFAULT_EQUIPMENT);
    setState({
      rows: SAMPLE_ROWS,
      selectedId: DEFAULT_ROW_ID,
      equipment: DEFAULT_EQUIPMENT,
      ...solved,
      status: "Converged",
      errorMessage: "",
      messages: [
        ...stateRef.current.messages,
        makeMessage("success", "Sample plant data restored. Base case is shown on the flowsheet."),
      ],
      selection: { kind: "object", id: "E-1" },
      bottomTab: "streams",
      chartTab: "temperature",
      propertyTab: "specifications",
      menu: null,
      uploadOpen: false,
      activeUnitId: null,
      unitSpecs: defaultUnitSpecs(),
    });
  }, [clearTimers, setDataset]);

  const applyUpload = useCallback(
    (text: string) => {
      const parsed = parsePlantCsv(text);
      if (parsed.errors.length > 0 || parsed.rows.length === 0) {
        setState((current) => ({
          ...current,
          messages: [
            ...current.messages,
            ...parsed.errors.map((error) => makeMessage("error", error)),
          ],
          bottomTab: "messages",
        }));
        return { ok: false, errors: parsed.errors };
      }

      runToken.current += 1;
      clearTimers();
      const equipment = {
        ...stateRef.current.equipment,
        u: DEFAULT_EQUIPMENT.u,
        area: DEFAULT_EQUIPMENT.area,
        pressureDropHot: DEFAULT_EQUIPMENT.pressureDropHot,
        pressureDropCold: DEFAULT_EQUIPMENT.pressureDropCold,
      };
      const solved = solveAll(parsed.rows, equipment);
      const first = parsed.rows[0];
      setDataset(null);
      if (userIdRef.current) {
        void uploadAndIngest(text, `Upload ${new Date().toISOString().slice(0, 16).replace("T", " ")}`, "upload").then((saved) => {
          if (saved.ok) {
            setDataset(saved.dataset.id);
            void refreshStored();
            notify(`Saved ${saved.dataset.row_count} rows to Supabase (CSV kept in Storage).`, "success");
          } else {
            notify(`Upload is shown locally but was not saved: ${saved.error}`, "warning");
          }
        });
      } else if (isSupabaseConfigured()) {
        notify("Sign in to save this upload to Supabase. It is shown locally for now.", "info");
      }
      const notes = [
        makeMessage(
          "success",
          `Loaded ${parsed.rows.length} plant rows (${parsed.rows[0].timestamp} to ${parsed.rows[parsed.rows.length - 1].timestamp}).`,
        ),
      ];
      if (parsed.inferredActuals) {
        notes.push(
          makeMessage(
            "warning",
            "Measured outlets were missing on some rows. Those actuals were set equal to the mock result, so their deviation is zero.",
          ),
        );
      }
      setState((current) => ({
        ...current,
        rows: parsed.rows,
        selectedId: first.id,
        equipment,
        ...solved,
        status: "Converged",
        errorMessage: "",
        messages: [...current.messages, ...notes],
        selection: { kind: "object", id: "E-1" },
        bottomTab: "streams",
        chartTab: "temperature",
        propertyTab: "specifications",
        menu: null,
        uploadOpen: false,
      }));
      return { ok: true, errors: [] };
    },
    [clearTimers, notify, setDataset, refreshStored],
  );

  const openDataset = useCallback(
    async (id: string) => {
      runToken.current += 1;
      clearTimers();
      const latest = await fetchDataset(id);
      if (!latest || latest.rows.length === 0) {
        notify("That dataset could not be loaded.", "error");
        return;
      }
      showDataset(latest, `Opened "${latest.dataset.name}" (${latest.rows.length} rows).`);
    },
    [clearTimers, notify, showDataset],
  );

  const removeDataset = useCallback(
    async (id: string) => {
      const removed = await deleteDataset(id);
      if (!removed.ok) {
        notify(`Could not delete the dataset: ${removed.error}`, "error");
        return;
      }
      notify("Dataset deleted. Its runs are kept without a dataset link.", "info");
      if (datasetIdRef.current === id) {
        const next = await fetchDataset();
        if (next && next.rows.length > 0) showDataset(next, `Opened "${next.dataset.name}".`);
        else {
          setDataset(null);
          loadSample();
        }
      }
      await refreshStored();
    },
    [loadSample, notify, refreshStored, setDataset, showDataset],
  );

  const acknowledgeAlerts = useCallback(
    async (ids?: string[]) => {
      const done = await apiAcknowledgeAlerts(ids);
      if (!done.ok) notify(`Could not acknowledge alerts: ${done.error}`, "error");
      await refreshStored();
    },
    [notify, refreshStored],
  );

  const generateDemoRuns = useCallback(async () => {
    const datasetId = datasetIdRef.current;
    if (!userIdRef.current || !datasetId) {
      notify("Sign in and open a stored dataset first.", "warning");
      return;
    }
    const { rows, results, predictions, equipment } = stateRef.current;
    const items = rows.flatMap((row) =>
      results[row.id] && predictions[row.id]
        ? [{ row, output: results[row.id], prediction: predictions[row.id] }]
        : [],
    );
    const anomalies = buildAnomalies(rows, results, predictions);
    const seeded = await seedDemoRuns(datasetId, items, equipment, anomalies);
    if (seeded.ok) {
      notify(`Stored ${seeded.runs} demo runs and ${seeded.alerts} alerts. ML values are demo data.`, "success");
    } else {
      notify(`Demo data was not stored: ${seeded.error}`, "warning");
    }
    await refreshStored();
  }, [notify, refreshStored]);

  const setUploadOpen = useCallback((open: boolean) => {
    setState((current) => ({ ...current, uploadOpen: open, menu: null }));
  }, []);

  const setBottomTab = useCallback((tab: BottomTab) => {
    setState((current) => ({ ...current, bottomTab: tab }));
  }, []);

  const setChartTab = useCallback((tab: ChartTab) => {
    setState((current) => ({
      ...current,
      chartTab: tab,
      bottomTab: tab === "sensitivity" || tab === "twin" ? "charts" : current.bottomTab,
    }));
  }, []);

  const setPropertyTab = useCallback((tab: PropertyTab) => {
    setState((current) => ({ ...current, propertyTab: tab }));
  }, []);

  const setMenu = useCallback((menu: MenuId | null) => {
    setState((current) => ({ ...current, menu }));
  }, []);

  const showSensitivity = useCallback(() => {
    setState((current) => ({
      ...current,
      bottomTab: "charts",
      chartTab: "sensitivity",
      menu: null,
    }));
  }, []);

  const connectActive = useCallback(() => {
    const snapshot = stateRef.current;
    const text = snapshot.activeUnitId
      ? evaluateUnit(snapshot.activeUnitId, snapshot.unitSpecs[snapshot.activeUnitId] ?? {}).connections
      : "Connected S1 → P-1 → E-1 → S2 and S3 → P-2 → E-1 → S4.";
    setState((current) => ({
      ...current,
      bottomTab: "streams",
      messages: [...current.messages, makeMessage("success", text)],
    }));
  }, []);

  const autoLayout = useCallback(() => {
    setState((current) => ({
      ...current,
      activeUnitId: null,
      selection: { kind: "object", id: "E-1" },
      bottomTab: "streams",
      chartTab: "temperature",
      propertyTab: "specifications",
      messages: [
        ...current.messages,
        makeMessage("success", "Auto-layout applied to E-1, P-1, P-2, and streams S1–S4."),
      ],
    }));
  }, []);

  const optimize = useCallback(() => {
    const snapshot = stateRef.current;
    let best = snapshot.rows[0];
    let bestScore = Number.POSITIVE_INFINITY;
    for (const row of snapshot.rows) {
      const expected = snapshot.results[row.id];
      if (!expected || expected.status !== "Converged") continue;
      const score =
        Math.abs(row.hot_outlet_actual - expected.hot_outlet_temperature) +
        Math.abs(row.cold_outlet_actual - expected.cold_outlet_temperature);
      if (score < bestScore) {
        bestScore = score;
        best = row;
      }
    }
    setState((current) => ({
      ...current,
      selectedId: best.id,
      activeUnitId: null,
      bottomTab: "simulation",
      menu: null,
      messages: [
        ...current.messages,
        makeMessage(
          "success",
          `Optimization selected ${best.timestamp}. Temperature deviation sum is ${bestScore.toFixed(2)} °C.`,
        ),
      ],
    }));
  }, []);

  const cycleFlowsheet = useCallback(() => {
    setState((current) => {
      const order = [null, "heater", "cooler"] as const;
      const index = order.indexOf(current.activeUnitId as "heater" | "cooler" | null);
      const next = order[(index + 1) % order.length];
      return {
        ...current,
        activeUnitId: next,
        selection: next ? current.selection : { kind: "object", id: "E-1" },
        propertyTab: "specifications",
        bottomTab: "streams",
        chartTab: "temperature",
      };
    });
  }, []);

  const selectedRow =
    state.rows.find((row) => row.id === state.selectedId) ?? state.rows[0];

  const fallbackResult = selectedRow
    ? runMock(toSimulationInput(selectedRow, state.equipment))
    : null;
  const result = (selectedRow && state.results[selectedRow.id]) || fallbackResult;
  const prediction =
    (selectedRow && state.predictions[selectedRow.id]) ||
    (selectedRow && result ? predictFromOutput(selectedRow, result) : null);

  const anomalies = useMemo(
    () => buildAnomalies(state.rows, state.results, state.predictions),
    [state.predictions, state.results, state.rows],
  );

  const unitView = useMemo(
    () =>
      state.activeUnitId
        ? evaluateUnit(state.activeUnitId, state.unitSpecs[state.activeUnitId] ?? {})
        : null,
    [state.activeUnitId, state.unitSpecs],
  );

  const streams = useMemo(
    () =>
      unitView
        ? unitView.streams
        : selectedRow && result
          ? buildStreams(selectedRow, result)
          : [],
    [result, selectedRow, unitView],
  );

  const successCount = Object.values(state.results).filter(
    (item) => item.status === "Converged",
  ).length;
  const failedCount = Object.values(state.results).filter(
    (item) => item.status === "Failed",
  ).length;
  const stale = selectedRow
    ? state.signatures[selectedRow.id] !== inputSignature(selectedRow, state.equipment)
    : false;

  if (!selectedRow || !result || !prediction) {
    return (
      <div className="grid h-full place-items-center text-sm">
        No plant data is loaded.
      </div>
    );
  }

  const value: TwinContextValue = {
    rows: state.rows,
    selectedRow,
    equipment: state.equipment,
    result,
    prediction,
    streams,
    anomalies,
    status: state.status,
    errorMessage: state.errorMessage,
    messages: state.messages,
    selection: state.selection,
    bottomTab: state.bottomTab,
    chartTab: state.chartTab,
    propertyTab: state.propertyTab,
    menu: state.menu,
    uploadOpen: state.uploadOpen,
    stale,
    successCount,
    failedCount,
    results: state.results,
    predictions: state.predictions,
    selectObject,
    selectUnavailable,
    selectRow,
    updateRow,
    updateEquipment,
    runSimulation: () => startRun("simulation"),
    stopSimulation,
    runDigitalTwin: () => startRun("twin"),
    loadSample,
    applyUpload,
    setUploadOpen,
    setBottomTab,
    setChartTab,
    setPropertyTab,
    setMenu,
    showSensitivity,
    notify,
    activeUnitId: state.activeUnitId,
    unitView,
    openUnit,
    openFlowsheet,
    updateUnitSpec,
    connectActive,
    autoLayout,
    optimize,
    cycleFlowsheet,
    backendEnabled,
    userEmail,
    userId,
    authOpen,
    setAuthOpen,
    signIn,
    signUp,
    signOut,
    stored,
    activeDatasetId,
    openDataset,
    removeDataset,
    acknowledgeAlerts,
    generateDemoRuns,
    refreshStored,
  };

  return <TwinContext.Provider value={value}>{children}</TwinContext.Provider>;
}

export function useTwin() {
  const context = useContext(TwinContext);
  if (!context) {
    throw new Error("useTwin must be used inside TwinProvider");
  }
  return context;
}
