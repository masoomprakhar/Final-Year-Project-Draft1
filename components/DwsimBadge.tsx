"use client";

import Link from "next/link";
import { useDwsimHealth } from "@/lib/dwsim/useDwsimHealth";

/** Small always-visible status for the DWSIM service; click for details on the Dashboard. */
export function DwsimBadge() {
  const { health } = useDwsimHealth();
  const look =
    health.state === "online"
      ? health.realDwsim
        ? { dot: "bg-[#1f8a3b]", text: "DWSIM live", tip: "Connected to real DWSIM" }
        : { dot: "bg-[#c28a00]", text: "DWSIM stub", tip: "Service is up but running the stand-in engine, not real DWSIM" }
      : health.state === "offline"
        ? { dot: "bg-[#b42318]", text: "DWSIM offline", tip: `Cannot reach the service: ${health.error}` }
        : { dot: "bg-[#9aa3ad]", text: "DWSIM not set", tip: "Set NEXT_PUBLIC_DWSIM_API_URL to connect" };
  return (
    <Link href="/dashboard" title={`${look.tip}. Click for details.`} className="mr-2 flex h-6 items-center gap-1.5 self-center border border-[#bbb] bg-white px-2 text-[11px] hover:bg-[#f1ecff]">
      <span className={`h-2 w-2 rounded-full ${look.dot} ${health.state === "online" ? "live-dot" : ""}`} />
      {look.text}
    </Link>
  );
}
