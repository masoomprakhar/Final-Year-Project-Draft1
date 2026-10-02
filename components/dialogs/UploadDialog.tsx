"use client";

import { useEffect, useState } from "react";
import { parsePlantCsv, REQUIRED_COLUMNS, type ParseResult } from "@/lib/csv/parsePlantCsv";
import { useTwin } from "@/lib/store/TwinProvider";

export function UploadDialog() {
  const { uploadOpen, setUploadOpen, applyUpload } = useTwin();
  const [fileName, setFileName] = useState("");
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState<ParseResult | null>(null);

  useEffect(() => {
    if (!uploadOpen) return;
    setFileName("");
    setText("");
    setParsed(null);
  }, [uploadOpen]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setUploadOpen(false);
    }
    if (uploadOpen) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setUploadOpen, uploadOpen]);

  if (!uploadOpen) return null;

  const canApply = Boolean(parsed && parsed.errors.length === 0 && parsed.rows.length > 0);
  const first = parsed?.rows[0]?.timestamp;
  const last = parsed?.rows[parsed.rows.length - 1]?.timestamp;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-6">
      <div className="flex max-h-[80vh] w-[760px] flex-col border border-[#c8c8c8] bg-white shadow-[0_16px_40px_rgba(0,0,0,0.18)]">
        <div className="flex items-center justify-between border-b border-[#e5e5e5] bg-[#f7f7f7] px-3 py-2">
          <h2 className="text-[13px] font-semibold">Upload Plant CSV</h2>
          <button type="button" onClick={() => setUploadOpen(false)} className="px-2 text-[14px]">
            ✕
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto px-4 py-3 text-[12px]">
          <p className="mb-2 text-[#444]">
            Required columns: {REQUIRED_COLUMNS.join(", ")}. Measured outlet columns are optional.
            Parsing happens in the browser.
          </p>
          <label className="inline-flex h-8 cursor-pointer items-center border border-[#1f4e79] px-3 font-semibold text-[#1f4e79] hover:bg-[#e7f1fb]">
            Choose CSV
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => {
                  const content = String(reader.result ?? "");
                  setFileName(file.name);
                  setText(content);
                  setParsed(parsePlantCsv(content));
                };
                reader.readAsText(file);
              }}
            />
          </label>
          {fileName && <span className="ml-2 text-[#555]">{fileName}</span>}
          {parsed && (
            <div className="mt-3">
              <div className="mb-2 grid grid-cols-3 gap-2">
                <Info label="Rows" value={String(parsed.rows.length)} />
                <Info
                  label="Validation"
                  value={parsed.errors.length === 0 ? "Passed" : `${parsed.errors.length} issue(s)`}
                />
                <Info label="Timestamp range" value={first && last ? `${first} → ${last}` : "—"} />
              </div>
              {parsed.errors.length > 0 && (
                <ul className="mb-2 list-disc space-y-0.5 pl-4 text-[#b42318]">
                  {parsed.errors.slice(0, 8).map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              )}
              {parsed.rows.length > 0 && (
                <table className="w-full border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-[#f7f7f7] text-left">
                      {["timestamp", "hot T", "hot F", "cold T", "cold F"].map((heading) => (
                        <th key={heading} className="border border-[#e5e5e5] px-1.5 py-1 font-semibold">
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.rows.slice(0, 6).map((row) => (
                      <tr key={row.id}>
                        <td className="border border-[#eee] px-1.5 py-1">{row.timestamp}</td>
                        <td className="border border-[#eee] px-1.5 py-1">{row.hot_temperature}</td>
                        <td className="border border-[#eee] px-1.5 py-1">{row.hot_flow}</td>
                        <td className="border border-[#eee] px-1.5 py-1">{row.cooling_temperature}</td>
                        <td className="border border-[#eee] px-1.5 py-1">{row.cooling_flow}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 border-t border-[#e5e5e5] px-3 py-2">
          <button type="button" onClick={() => setUploadOpen(false)} className="h-7 border border-[#c5c5c5] px-3">
            Cancel
          </button>
          <button
            type="button"
            disabled={!canApply}
            onClick={() => {
              if (text) applyUpload(text);
            }}
            className="h-7 bg-[#1f4e79] px-3 font-semibold text-white disabled:bg-[#9aa8b5]"
          >
            Use this data
          </button>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[#e5e5e5] bg-[#fafafa] px-2 py-1">
      <div className="text-[10px] uppercase text-[#6b7280]">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}
