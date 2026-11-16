"use client";

import { useState } from "react";
import { StoredNotice } from "@/components/bottom/StoredNotice";
import { formatStamp } from "@/lib/format";
import { useTwin } from "@/lib/store/TwinProvider";

export function DatasetsPanel() {
  const { stored, activeDatasetId, openDataset, removeDataset, userEmail, backendEnabled } = useTwin();
  const [confirming, setConfirming] = useState<string | null>(null);

  if (!backendEnabled || !userEmail) return <StoredNotice />;
  if (stored.datasets.length === 0) {
    return (
      <div className="grid h-full place-items-center bg-white text-[12px] text-[#444]">
        {stored.loading ? "Loading datasets…" : "No stored datasets yet. Upload a plant CSV from the File menu."}
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto bg-white">
      <table className="w-full min-w-[640px] border-collapse text-[12px]">
        <thead className="sticky top-0 bg-[#f7f7f7]">
          <tr>
            {["Name", "Source", "Rows", "Created", ""].map((label) => (
              <th key={label} className="border border-[#e1e1e1] px-2 py-0.5 text-left font-semibold">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {stored.datasets.map((dataset) => {
            const active = dataset.id === activeDatasetId;
            return (
              <tr key={dataset.id} className={active ? "bg-[#e7f1fb]" : ""}>
                <td className="border border-[#eee] px-2 py-0.5">
                  {dataset.name}
                  {active && <span className="ml-2 text-[11px] font-semibold text-[#1f4e79]">open</span>}
                </td>
                <td className="border border-[#eee] px-2 py-0.5">{dataset.source}</td>
                <td className="border border-[#eee] px-2 py-0.5 text-right">{dataset.row_count}</td>
                <td className="border border-[#eee] px-2 py-0.5">{formatStamp(dataset.created_at)}</td>
                <td className="whitespace-nowrap border border-[#eee] px-2 py-0.5 text-right">
                  {!active && (
                    <button
                      type="button"
                      onClick={() => void openDataset(dataset.id)}
                      className="mr-2 text-[#1f4e79] underline"
                    >
                      Open
                    </button>
                  )}
                  {confirming === dataset.id ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setConfirming(null);
                          void removeDataset(dataset.id);
                        }}
                        className="mr-2 font-semibold text-[#b42318] underline"
                      >
                        Confirm delete
                      </button>
                      <button type="button" onClick={() => setConfirming(null)} className="text-[#555] underline">
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button type="button" onClick={() => setConfirming(dataset.id)} className="text-[#b42318] underline">
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
