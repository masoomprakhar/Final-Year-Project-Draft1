"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { parsePlantCsv } from "@/lib/csv/parsePlantCsv";
import { DEFAULT_ROW_ID, SAMPLE_ROWS } from "@/lib/data/samplePlantData";
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
};

const TwinContext = createContext<TwinContextValue | null>(null);

export function TwinProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<TwinState>(createInitialState);
  const stateRef = useRef(state);
  stateRef.current = state;
  const runToken = useRef(0);
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
      selection: { kind: "object", id },
      propertyTab: id === "E-1" ? current.propertyTab : "general",
    }));
  }, []);

  const selectUnavailable = useCallback(
    (name: string) => {
      setState((current) => ({
        ...current,
        selection: { kind: "unavailable", name },
        propertyTab: "general",
        bottomTab: "messages",
      }));
      notify(`${name} is not in this heat-exchanger flowsheet.`);
    },
    [notify],
  );

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
    [],
  );

  const startRun = useCallback(
    (mode: "simulation" | "twin") => {
      const snapshot = stateRef.current;
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
    });
  }, [clearTimers]);

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
    [clearTimers],
  );

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

  const streams = useMemo(
    () => (selectedRow && result ? buildStreams(selectedRow, result) : []),
    [result, selectedRow],
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
