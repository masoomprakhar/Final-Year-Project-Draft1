"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useFlowsheets } from "@/lib/store/FlowsheetProvider";
import { useTwin } from "@/lib/store/TwinProvider";

const KEY = "simcourt.guide.seen";

export function QuickGuide() {
  const twin = useTwin();
  const fs = useFlowsheets();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setOpen(true);
    } catch {
      /* storage unavailable: stay closed */
    }
    const show = () => setOpen(true);
    window.addEventListener("open-guide", show);
    return () => window.removeEventListener("open-guide", show);
  }, []);

  function close() {
    setOpen(false);
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      /* ignore */
    }
  }

  const steps = [
    { done: twin.rows.length > 0, title: "1. Plant data is loaded", text: "The sample data is already in. You can also upload your own CSV.", action: "Upload my CSV", run: () => { close(); twin.setUploadOpen(true); } },
    { done: twin.successCount > 0, title: "2. Run the simulation", text: "Calculates the heat exchanger for every row and compares it with the plant.", action: "Run now", run: () => { twin.runSimulation(); close(); } },
    { done: false, title: "3. Read the results", text: "The bottom panel shows streams, results, charts and alerts.", action: "Show results", run: () => { twin.setBottomTab("simulation"); close(); } },
    { done: fs.docs.length > 0, title: "4. Build your own flowsheet", text: "Add units, connect them with streams, then run. Start with an empty one.", action: "New flowsheet", run: () => { fs.createFlowsheet(); close(); } },
  ];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Quick guide"
        className="fixed bottom-4 left-4 z-50 grid h-9 w-9 place-items-center rounded-full border border-[#1f4e79] bg-white text-[16px] font-bold text-[#1f4e79] shadow-md hover:bg-[#e7f1fb]"
      >
        ?
      </button>
      {open && (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-black/35 p-4" onClick={close}>
          <div className="fade-in w-[560px] max-w-full border border-[#c8c8c8] bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-[18px] font-semibold text-[#1f4e79]">Welcome to Simcourt</h2>
            <p className="mb-3 text-[13px] text-[#444]">A digital twin of a heat exchanger: simulate it, compare with plant data, and build your own process flowsheets. Four steps:</p>
            <ol className="space-y-2">
              {steps.map((s) => (
                <li key={s.title} className={`flex items-center gap-3 border p-2 text-[12px] ${s.done ? "border-[#1f8a3b] bg-[#f0faf3]" : "border-[#d8d8d8]"}`}>
                  <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] text-white ${s.done ? "bg-[#1f8a3b]" : "bg-[#b5b5b5]"}`}>{s.done ? "✓" : ""}</span>
                  <span className="min-w-0 flex-1"><b>{s.title}</b><br />{s.text}</span>
                  <button type="button" onClick={s.run} className="h-7 shrink-0 border border-[#1f4e79] px-2 font-semibold text-[#1f4e79] hover:bg-[#e7f1fb]">{s.action}</button>
                </li>
              ))}
            </ol>
            <p className="mt-3 text-[12px] text-[#444]">
              More: <Link href="/dashboard" onClick={close} className="text-[#1f4e79] underline">Dashboard</Link> ·{" "}
              <Link href="/dynamics" onClick={close} className="text-[#1f4e79] underline">Dynamics</Link> ·{" "}
              <Link href="/optimization" onClick={close} className="text-[#1f4e79] underline">Optimization</Link> ·{" "}
              <Link href="/map" onClick={close} className="text-[#1f4e79] underline">Feature map</Link>. Press <b>?</b> any time to reopen this.
            </p>
            <div className="mt-4 text-right"><button type="button" onClick={close} className="h-8 border border-[#1f4e79] bg-[#1f4e79] px-4 font-semibold text-white hover:bg-[#173b5d]">Got it</button></div>
          </div>
        </div>
      )}
    </>
  );
}
