"use client";

import { useState } from "react";
import { DWSIM_URL, testDwsimSolve, type DwsimTest } from "@/lib/dwsim/client";
import { useDwsimHealth } from "@/lib/dwsim/useDwsimHealth";
import { DWSIM_COVERAGE, DWSIM_NOT_COVERED } from "@/lib/dwsim/coverage";

export function DwsimPanel() {
  const { health, checkedAt, refresh } = useDwsimHealth();
  const [test, setTest] = useState<DwsimTest | null>(null);
  const [testing, setTesting] = useState(false);
  async function runTest() {
    setTesting(true);
    setTest(await testDwsimSolve());
    setTesting(false);
  }
  const badge =
    health.state === "online"
      ? health.realDwsim
        ? { text: "Connected · real DWSIM", cls: "bg-[#e3f4e8] text-[#0f7a32]" }
        : { text: "Connected · stub engine (not real DWSIM)", cls: "bg-[#fff3d6] text-[#8a5a00]" }
      : health.state === "offline"
        ? { text: `Offline · ${health.error}`, cls: "bg-[#fdecec] text-[#b42318]" }
        : { text: "Not configured · set NEXT_PUBLIC_DWSIM_API_URL", cls: "bg-[#eceff3] text-[#445]" };
  const live = health.state === "online";

  return (
    <section className="dwsim-glow border-2 border-[#6b4fd8] bg-[#f6f3ff] p-3 text-[12px]">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <h2 className="text-[14px] font-semibold text-[#3d2a9a]">DWSIM coverage</h2>
        <span className={`px-2 py-0.5 font-semibold ${badge.cls}`}>{badge.text}</span>
        {DWSIM_URL && <code className="text-[#555]">{DWSIM_URL}</code>}
        {checkedAt && <span className="text-[#666]">checked {checkedAt.toLocaleTimeString()} · auto-refreshes</span>}
        <button type="button" onClick={() => void refresh()} className="h-6 border border-[#6b4fd8] bg-white px-2 font-semibold text-[#3d2a9a] hover:bg-[#ece7ff]">Refresh</button>
        <button type="button" disabled={!DWSIM_URL || testing} onClick={() => void runTest()} className="h-6 border border-[#6b4fd8] bg-[#6b4fd8] px-2 font-semibold text-white hover:bg-[#573fb8] disabled:opacity-40">{testing ? "Solving…" : "▶ Test live solve"}</button>
      </div>
      {test && (
        <p className={`mb-2 border-l-4 px-2 py-1 ${test.ok ? "border-[#1f8a3b] bg-[#e9f7ee]" : "border-[#b42318] bg-[#fdecea]"}`}>
          {test.ok
            ? `Reference case solved in ${test.ms} ms: hot out ${test.hotOut} °C, cold out ${test.coldOut} °C, duty ${test.duty} kW (expected 28.4 / 33.6 / 125.3).`
            : `Test failed: ${test.error}`}
        </p>
      )}
      <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-4">
        <div className="flex flex-wrap gap-1.5">
          {DWSIM_COVERAGE.map((c) => (
            <span
              key={c.feature}
              title={`DWSIM object: ${c.dwsimObject}${c.inStub ? "" : " (needs the real engine)"}`}
              className={`border px-2 py-0.5 ${live && (c.inStub || (health.state === "online" && health.realDwsim)) ? "border-[#0f7a32] bg-[#e3f4e8]" : "border-[#b9aef0] bg-white"}`}
            >
              {c.feature}
              {!c.inStub && <span className="ml-1 text-[#6b4fd8]">· real engine</span>}
            </span>
          ))}
        </div>
        <div>
          <p className="font-semibold">Not DWSIM-backed</p>
          <ul className="list-disc pl-4 text-[#444]">
            {DWSIM_NOT_COVERED.map((n) => <li key={n}>{n}</li>)}
          </ul>
        </div>
      </div>
    </section>
  );
}
