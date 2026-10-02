"use client";

import { X } from "lucide-react";
import { useState } from "react";
import { NumberField } from "@/components/NumberField";
import { StatusPill } from "@/components/StatusPill";
import { formatNumber, formatSigned } from "@/lib/format";
import { useTwin } from "@/lib/store/TwinProvider";
import type { EquipmentSpecs, ObjectId, PropertyTab, StreamColumn } from "@/lib/types";

const OBJECTS: { id: ObjectId; label: string }[] = [
  { id: "E-1", label: "E-1 (Heat Exchanger)" },
  { id: "P-1", label: "P-1 (Pump)" },
  { id: "P-2", label: "P-2 (Pump)" },
  { id: "S1", label: "S1 (Hot Feed)" },
  { id: "S2", label: "S2 (Hot Outlet)" },
  { id: "S3", label: "S3 (Cooling Water)" },
  { id: "S4", label: "S4 (Cold Outlet)" },
];

const TABS: { id: PropertyTab; label: string }[] = [
  { id: "general", label: "General" },
  { id: "specifications", label: "Specifications" },
  { id: "results", label: "Results" },
];

export function PropertiesPanel() {
  const twin = useTwin();
  const [open, setOpen] = useState(true);
  const selectedId = twin.selection.kind === "object" ? twin.selection.id : null;
  const stream = twin.streams.find((item) => item.id === selectedId);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-7 shrink-0 border-l border-[#d0d0d0] bg-[#f7f7f7] text-[11px]"
      >
        <span className="inline-block rotate-180 [writing-mode:vertical-rl]">Properties</span>
      </button>
    );
  }

  return (
    <aside className="flex w-[352px] shrink-0 flex-col border-l border-[#d0d0d0] bg-white">
      <div className="flex h-8 items-center justify-between border-b border-[#e1e1e1] bg-[#f3f3f3] px-2">
        <span className="text-[12px] font-semibold">Properties</span>
        <button type="button" title="Collapse properties" onClick={() => setOpen(false)}>
          <X className="h-3.5 w-3.5 text-[#555]" />
        </button>
      </div>
      <div className="border-b border-[#e6e6e6] px-2 py-2">
        <label className="mb-1 block text-[11px] text-[#555]">Object</label>
        <select
          value={twin.unitView ? `unit:${twin.unitView.id}` : (selectedId ?? "E-1")}
          onChange={(event) => {
            const value = event.target.value;
            if (value.startsWith("unit:")) {
              twin.openUnit(value.slice(5));
              return;
            }
            twin.selectObject(value as ObjectId);
          }}
          className="h-7 w-full border border-[#c5c5c5] bg-white px-1 text-[12px] outline-none focus:border-[#2b7cd3]"
        >
          {twin.unitView && (
            <option value={`unit:${twin.unitView.id}`}>
              {twin.unitView.name} ({twin.unitView.typeLabel})
            </option>
          )}
          {OBJECTS.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex h-8 items-end border-b border-[#d5d5d5] bg-[#f7f7f7] px-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => twin.setPropertyTab(tab.id)}
            className={`mr-3 h-7 px-1 text-[12px] ${
              twin.propertyTab === tab.id
                ? "border-b-2 border-[#1f4e79] font-semibold text-[#1f4e79]"
                : "text-[#444]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-auto px-3 py-2 text-[12px]">
        {twin.unitView ? (
          <UnitDetails />
        ) : twin.propertyTab === "general" ? (
          <General objectId={selectedId ?? "E-1"} stream={stream} />
        ) : twin.propertyTab === "specifications" ? (
          <Specifications objectId={selectedId ?? "E-1"} stream={stream} />
        ) : (
          <Results objectId={selectedId ?? "E-1"} stream={stream} />
        )}
      </div>
    </aside>
  );
}

function General({ objectId, stream }: { objectId: ObjectId; stream: StreamColumn | undefined }) {
  const { selectedRow } = useTwin();
  const identity = OBJECTS.find((item) => item.id === objectId);
  return (
    <div className="space-y-2">
      <Readout label="Name" value={identity?.label ?? objectId} />
      <Readout label="Flowsheet" value="Main Flowsheet" />
      <Readout label="Timestamp" value={selectedRow.timestamp} />
      {objectId === "E-1" ? (
        <DescriptionBox />
      ) : (
        <Readout
          label="Connected value"
          value={
            stream
              ? `${formatNumber(stream.temperature, 1)} °C, ${formatNumber(stream.pressure, 1)} bar, ${formatNumber(stream.massFlow, 1)} kg/h`
              : "Shown on the flowsheet"
          }
        />
      )}
    </div>
  );
}

function Specifications({
  objectId,
  stream,
}: {
  objectId: ObjectId;
  stream: StreamColumn | undefined;
}) {
  const twin = useTwin();

  if (objectId === "E-1") {
    return (
      <div>
        <div className="grid grid-cols-[118px_minmax(0,1fr)] items-center gap-1.5 py-[3px]">
          <span>Calculation Type</span>
          <select
            value={twin.equipment.calculationType}
            onChange={(event) =>
              twin.updateEquipment({
                calculationType: event.target.value as EquipmentSpecs["calculationType"],
              })
            }
            className="h-[22px] w-full border border-[#c5c5c5] bg-white px-1 text-[12px]"
          >
            <option>Specify Outlet Temperature</option>
            <option>Specify Heat Duty</option>
            <option>Specify Area</option>
          </select>
        </div>
        {twin.equipment.calculationType === "Specify Heat Duty" ? (
          <Field label="Heat Duty" unit="kW">
            <NumberField
              value={twin.equipment.heatDutySpec}
              onCommit={(value) => twin.updateEquipment({ heatDutySpec: value })}
            />
          </Field>
        ) : (
          <Field label="Hot Outlet Temperature" unit="°C">
            <NumberField
              value={twin.selectedRow.hot_outlet_spec}
              onCommit={(value) => twin.updateRow({ hot_outlet_spec: value })}
            />
          </Field>
        )}
        <Field label="Cold Inlet Temperature" unit="°C">
          <NumberField
            value={twin.selectedRow.cooling_temperature}
            onCommit={(value) => twin.updateRow({ cooling_temperature: value })}
          />
        </Field>
        <Field label="Overall Heat Transfer Coefficient (U)" unit="W/m²·K">
          <NumberField
            value={twin.equipment.u}
            step="1"
            onCommit={(value) => twin.updateEquipment({ u: value })}
          />
        </Field>
        <Field label="Heat Exchange Area" unit="m²">
          <NumberField
            value={twin.equipment.area}
            step="1"
            onCommit={(value) => twin.updateEquipment({ area: value })}
          />
        </Field>
        <Field label="Pressure Drop (Hot Side)" unit="bar">
          <NumberField
            value={twin.equipment.pressureDropHot}
            onCommit={(value) => twin.updateEquipment({ pressureDropHot: value })}
          />
        </Field>
        <Field label="Pressure Drop (Cold Side)" unit="bar">
          <NumberField
            value={twin.equipment.pressureDropCold}
            onCommit={(value) => twin.updateEquipment({ pressureDropCold: value })}
          />
        </Field>
        <p className="mt-2 text-[11px] leading-snug text-[#6b7280]">
          {twin.equipment.calculationType === "Specify Area"
            ? "Duty follows U, area, and the inlet temperature difference."
            : twin.equipment.calculationType === "Specify Heat Duty"
              ? "Outlets follow the specified heat duty and the two flows."
              : "Duty follows the specified hot outlet temperature and the hot flow."}
        </p>
        <CalculationResults />
      </div>
    );
  }

  if (objectId === "S1" || objectId === "S3") {
    const hot = objectId === "S1";
    return (
      <div>
        <Field label="Temperature" unit="°C">
          <NumberField
            value={hot ? twin.selectedRow.hot_temperature : twin.selectedRow.cooling_temperature}
            onCommit={(value) =>
              twin.updateRow(hot ? { hot_temperature: value } : { cooling_temperature: value })
            }
          />
        </Field>
        <Field label="Pressure" unit="bar">
          <NumberField
            value={hot ? twin.selectedRow.hot_pressure : twin.selectedRow.cooling_pressure}
            onCommit={(value) =>
              twin.updateRow(hot ? { hot_pressure: value } : { cooling_pressure: value })
            }
          />
        </Field>
        <Field label="Mass Flow" unit="kg/h">
          <NumberField
            value={hot ? twin.selectedRow.hot_flow : twin.selectedRow.cooling_flow}
            onCommit={(value) => twin.updateRow(hot ? { hot_flow: value } : { cooling_flow: value })}
          />
        </Field>
        <Field label="Composition" unit="mass frac.">
          <NumberField
            value={twin.selectedRow.composition}
            step="0.01"
            onCommit={(value) => twin.updateRow({ composition: value })}
          />
        </Field>
        {hot && (
          <Field label="Specified hot outlet" unit="°C">
            <NumberField
              value={twin.selectedRow.hot_outlet_spec}
              onCommit={(value) => twin.updateRow({ hot_outlet_spec: value })}
            />
          </Field>
        )}
      </div>
    );
  }

  if (objectId === "P-1" || objectId === "P-2") {
    const hot = objectId === "P-1";
    return (
      <div className="space-y-2">
        <Readout label="Service" value={hot ? "Hot feed" : "Cooling water"} />
        <Readout
          label="Suction flow"
          value={`${formatNumber(hot ? twin.selectedRow.hot_flow : twin.selectedRow.cooling_flow, 1)} kg/h`}
        />
        <Readout
          label="Suction pressure"
          value={`${formatNumber(hot ? twin.selectedRow.hot_pressure : twin.selectedRow.cooling_pressure, 1)} bar`}
        />
        <p className="text-[11px] leading-snug text-[#6b7280]">
          The pump is drawn on the flowsheet. Reported pressures are the stream values around E-1.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-[#555]">This outlet is calculated by the mock model.</p>
      {stream && (
        <>
          <Readout label="Temperature" value={`${formatNumber(stream.temperature, 1)} °C`} />
          <Readout label="Pressure" value={`${formatNumber(stream.pressure, 1)} bar`} />
          <Readout label="Mass flow" value={`${formatNumber(stream.massFlow, 1)} kg/h`} />
        </>
      )}
    </div>
  );
}

function Results({ objectId, stream }: { objectId: ObjectId; stream: StreamColumn | undefined }) {
  const twin = useTwin();
  if (objectId === "E-1" || objectId === "S2" || objectId === "S4") {
    const actualHot = twin.selectedRow.hot_outlet_actual;
    const actualCold = twin.selectedRow.cold_outlet_actual;
    const rows = [
      ["Hot outlet temperature", actualHot, twin.result.hot_outlet_temperature, twin.prediction.hot_outlet_temperature, "°C"],
      ["Cold outlet temperature", actualCold, twin.result.cold_outlet_temperature, twin.prediction.cold_outlet_temperature, "°C"],
      ["Heat duty", null, twin.result.heat_duty, twin.prediction.heat_duty, "kW"],
    ] as const;

    return (
      <div>
        <CalculationResults />
        <h3 className="mb-1 mt-3 font-semibold text-[#1f4e79]">Actual vs mock vs ML</h3>
        <p className="mb-2 text-[11px] text-[#6b7280]">ML values are demo predictions, separate from mock physics.</p>
        <table className="w-full border-collapse text-[11px]">
          <thead>
            <tr className="text-left text-[#555]">
              <th className="py-1 font-medium">Variable</th>
              <th className="py-1 text-right font-medium">Actual</th>
              <th className="py-1 text-right font-medium">Mock</th>
              <th className="py-1 text-right font-medium">ML</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row[0]} className="border-t border-[#eee]">
                <td className="py-1 pr-1">{row[0]}</td>
                <td className="py-1 text-right">{row[1] === null ? "—" : formatNumber(row[1], 1)}</td>
                <td className="py-1 text-right">{formatNumber(row[2], 1)}</td>
                <td className="py-1 text-right">{formatNumber(row[3], 1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-2 text-[11px] text-[#555]">
          Hot outlet deviation{" "}
          {formatSigned(actualHot - twin.result.hot_outlet_temperature, 2)} °C
        </div>
      </div>
    );
  }

  if (!stream) return <p>Select an object on the flowsheet.</p>;
  return (
    <div className="space-y-2">
      <Readout label="Temperature" value={`${formatNumber(stream.temperature, 1)} °C`} />
      <Readout label="Pressure" value={`${formatNumber(stream.pressure, 1)} bar`} />
      <Readout label="Enthalpy" value={`${formatNumber(stream.enthalpy, 1)} kJ/kg`} />
      <Readout label="Density" value={`${formatNumber(stream.density, 1)} kg/m³`} />
    </div>
  );
}

function UnitDetails() {
  const twin = useTwin();
  const view = twin.unitView;
  if (!view) return null;

  if (twin.propertyTab === "general") {
    return (
      <div className="space-y-2">
        <Readout label="Name" value={`${view.name} (${view.typeLabel})`} />
        <Readout label="Flowsheet" value={view.name} />
        <p>{view.description}</p>
        <p className="text-[11px] text-[#6b7280]">{view.connections}</p>
      </div>
    );
  }

  if (twin.propertyTab === "results") {
    return (
      <div>
        {view.results.map((field) => (
          <ResultRow
            key={field.label}
            label={field.label}
            value={formatNumber(field.value, field.digits)}
            unit={field.unit}
          />
        ))}
        <p className="mt-2 text-[11px] text-[#6b7280]">Dummy unit model. These numbers update when the specifications change.</p>
      </div>
    );
  }

  return (
    <div>
      {view.specs.map((field) => (
        <Field key={`${view.id}-${field.key}`} label={field.label} unit={field.unit}>
          <NumberField
            value={field.value}
            onCommit={(value) => twin.updateUnitSpec(field.key, value)}
          />
        </Field>
      ))}
    </div>
  );
}

function CalculationResults() {
  const { result, stale, status, errorMessage } = useTwin();
  return (
    <div className="mt-3 border-t border-[#e5e5e5] pt-2">
      <div className="mb-1 flex items-center justify-between">
        <h3 className="font-semibold">Calculation Results</h3>
        <StatusPill status={status === "Converged" || status === "Failed" ? status : status} />
      </div>
      {stale && (
        <p className="mb-1 text-[11px] text-[#8a5a00]">
          Inputs changed. Run Simulation to update these results.
        </p>
      )}
      {status === "Failed" && errorMessage && (
        <p className="mb-1 text-[11px] text-[#b42318]">{errorMessage}</p>
      )}
      <ResultRow label="Heat Duty" value={formatNumber(result.heat_duty, 1)} unit="kW" />
      <ResultRow label="Hot Outlet Temperature" value={formatNumber(result.hot_outlet_temperature, 1)} unit="°C" />
      <ResultRow label="Cold Outlet Temperature" value={formatNumber(result.cold_outlet_temperature, 1)} unit="°C" />
      <ResultRow label="Log Mean Temperature Difference" value={formatNumber(result.lmtd, 1)} unit="°C" />
      <ResultRow label="Reynolds Number (Hot Side)" value={formatNumber(result.reynolds_hot, 0)} unit="" />
      <ResultRow label="Reynolds Number (Cold Side)" value={formatNumber(result.reynolds_cold, 0)} unit="" />
      <ResultRow label="Pressure Drop (Hot Side)" value={formatNumber(result.pressure_drop_hot, 2)} unit="bar" />
      <ResultRow label="Pressure Drop (Cold Side)" value={formatNumber(result.pressure_drop_cold, 2)} unit="bar" />
      <p className="mt-2 text-[11px] text-[#6b7280]">Mock physics. These results are not from DWSIM.</p>
    </div>
  );
}

function Field({
  label,
  unit,
  children,
}: {
  label: string;
  unit?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_72px_88px] items-center gap-1.5 py-[3px]">
      <span className="leading-tight text-[#243042]">{label}</span>
      {children}
      {unit ? (
        <select className="h-[22px] w-full border border-[#c5c5c5] bg-white px-1 text-[11px]" defaultValue={unit}>
          <option>{unit}</option>
        </select>
      ) : (
        <span />
      )}
    </div>
  );
}

function ResultRow({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_56px_44px] items-baseline gap-1 py-[2px]">
      <span>{label}</span>
      <span className="text-right font-medium">{value}</span>
      <span className="text-[#555]">{unit}</span>
    </div>
  );
}

function Readout({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] text-[#6b7280]">{label}</div>
      <div>{value}</div>
    </div>
  );
}

function DescriptionBox() {
  const { equipment, updateEquipment } = useTwin();
  return (
    <label className="block">
      <span className="mb-1 block text-[#555]">Description</span>
      <textarea
        value={equipment.description}
        onChange={(event) => updateEquipment({ description: event.target.value })}
        rows={3}
        className="w-full border border-[#c5c5c5] px-1.5 py-1 outline-none focus:border-[#2b7cd3]"
      />
    </label>
  );
}
