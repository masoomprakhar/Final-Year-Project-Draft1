"use client";

import { NumberField } from "@/components/NumberField";
import { CATALOG } from "@/lib/flowsheet/flowsheetCatalog";
import { formatNumber } from "@/lib/format";
import { useFlowsheets } from "@/lib/store/FlowsheetProvider";

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="grid grid-cols-[1fr_120px] items-center gap-2 border-b border-[#eee] px-2 py-1 text-[12px]">
    <span>{label}</span>
    <div className="text-right">{children}</div>
  </div>
);

export function FlowsheetProperties() {
  const fs = useFlowsheets();
  const doc = fs.active!;
  const unit = fs.selection?.kind === "unit" ? doc.units.find((u) => u.id === fs.selection!.id) : undefined;
  const stream = fs.selection?.kind === "stream" ? doc.streams.find((s) => s.id === fs.selection!.id) : undefined;
  const tagOf = (id: string | null) => doc.units.find((u) => u.id === id)?.tag ?? null;

  return (
    <aside className="flex w-[352px] shrink-0 flex-col overflow-auto border-l border-[#d0d0d0] bg-white">
      <div className="flex h-8 shrink-0 items-center justify-between border-b border-[#e1e1e1] bg-[#f3f3f3] px-2 text-[12px] font-semibold">
        <span>{unit ? `${unit.tag} · ${CATALOG[unit.type].label}` : stream ? `Stream ${stream.tag}` : "Flowsheet"}</span>
        {fs.selection && (
          <button type="button" onClick={fs.deleteSelected} className="border border-[#b42318] px-2 text-[11px] font-normal text-[#b42318] hover:bg-[#fdecea]">
            Delete
          </button>
        )}
      </div>

      {!unit && !stream && (
        <div className="text-[12px]">
          <Row label="Name">
            <input
              defaultValue={doc.name}
              key={doc.id}
              onBlur={(event) => fs.renameFlowsheet(event.target.value)}
              className="h-[22px] w-full border border-[#c5c5c5] px-1 text-right outline-none focus:border-[#2b7cd3]"
            />
          </Row>
          <Row label="Units">{doc.units.length}</Row>
          <Row label="Streams">{doc.streams.length}</Row>
          <Row label="Saved to account">{fs.saving ? "Saving…" : "Yes when signed in"}</Row>
          <p className="px-2 py-2 text-[#555]">Select a unit or stream on the canvas to edit it. Run Simulation solves the whole flowsheet.</p>
          {fs.solution && (
            <div className="px-2 pb-2">
              <p className={`font-semibold ${fs.solution.ok ? "text-[#0f7a32]" : "text-[#b42318]"}`}>
                {fs.solution.ok ? "Solved" : "Not solved"}
              </p>
              {fs.solution.errors.map((e) => (
                <p key={e} className="text-[#b42318]">{e}</p>
              ))}
              {fs.solution.warnings.map((w) => (
                <p key={w} className="text-[#8a5a00]">{w}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {unit && (
        <div>
          <p className="px-2 pt-2 text-[11px] font-semibold uppercase text-[#666]">Specifications</p>
          {CATALOG[unit.type].specs.map((spec) => {
            const fed = spec.feed ? doc.streams.some((s) => s.toUnitId === unit.id && s.toPort === spec.feed!.inlet) : false;
            return (
              <Row key={spec.key} label={`${spec.label} (${spec.unit})`}>
                {fed ? (
                  <span className="text-[#666]" title="Taken from the connected stream">from stream</span>
                ) : (
                  <NumberField value={unit.specs[spec.key] ?? spec.value} onCommit={(v) => fs.updateSpec(unit.id, spec.key, v)} />
                )}
              </Row>
            );
          })}
          <p className="px-2 pt-3 text-[11px] font-semibold uppercase text-[#666]">Results</p>
          {fs.solution?.units[unit.id]?.results.length ? (
            fs.solution.units[unit.id].results.map((r) => (
              <Row key={r.label} label={`${r.label} (${r.unit})`}>{formatNumber(r.value, r.digits)}</Row>
            ))
          ) : (
            <p className="px-2 py-1 text-[12px] text-[#555]">Run Simulation to see results.</p>
          )}
          {fs.solution?.units[unit.id]?.messages.map((m) => (
            <p key={m} className="px-2 text-[12px] text-[#b42318]">{m}</p>
          ))}
        </div>
      )}

      {stream && (
        <div>
          <Row label="Source">
            {tagOf(stream.fromUnitId) ? (
              <button type="button" className="text-[#1f4e79] underline" onClick={() => fs.detach(stream.id, "from")}>
                {tagOf(stream.fromUnitId)} · detach
              </button>
            ) : (
              "Feed (free)"
            )}
          </Row>
          <Row label="Target">
            {tagOf(stream.toUnitId) ? (
              <button type="button" className="text-[#1f4e79] underline" onClick={() => fs.detach(stream.id, "to")}>
                {tagOf(stream.toUnitId)} · detach
              </button>
            ) : (
              "Product (free)"
            )}
          </Row>
          {stream.fromUnitId ? (
            <>
              <p className="px-2 pt-3 text-[11px] font-semibold uppercase text-[#666]">Calculated</p>
              {fs.solution?.streams[stream.id] ? (
                <>
                  <Row label="Temperature (°C)">{formatNumber(fs.solution.streams[stream.id].temperature, 1)}</Row>
                  <Row label="Pressure (bar)">{formatNumber(fs.solution.streams[stream.id].pressure, 2)}</Row>
                  <Row label="Mass flow (kg/h)">{formatNumber(fs.solution.streams[stream.id].flow, 1)}</Row>
                  <Row label="Vapor fraction">{formatNumber(fs.solution.streams[stream.id].vaporFraction, 2)}</Row>
                </>
              ) : (
                <p className="px-2 py-1 text-[12px] text-[#555]">Run Simulation to calculate this stream.</p>
              )}
            </>
          ) : (
            <>
              <p className="px-2 pt-3 text-[11px] font-semibold uppercase text-[#666]">Feed conditions</p>
              <Row label="Temperature (°C)"><NumberField value={stream.temperature} onCommit={(v) => fs.updateStream(stream.id, { temperature: v })} /></Row>
              <Row label="Pressure (bar)"><NumberField value={stream.pressure} onCommit={(v) => fs.updateStream(stream.id, { pressure: v })} /></Row>
              <Row label="Mass flow (kg/h)"><NumberField value={stream.flow} onCommit={(v) => fs.updateStream(stream.id, { flow: v })} /></Row>
            </>
          )}
        </div>
      )}
    </aside>
  );
}
