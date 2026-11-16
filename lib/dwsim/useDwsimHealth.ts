"use client";

import { useCallback, useEffect, useState } from "react";
import { checkDwsim, DWSIM_URL, type DwsimHealth } from "@/lib/dwsim/client";

/** Polls the DWSIM service so every screen shows the same live status. */
export function useDwsimHealth(intervalMs = 15000) {
  const [health, setHealth] = useState<DwsimHealth>({ state: "unconfigured" });
  const [checkedAt, setCheckedAt] = useState<Date | null>(null);
  const refresh = useCallback(async () => {
    const result = await checkDwsim();
    setHealth(result);
    setCheckedAt(new Date());
  }, []);
  useEffect(() => {
    if (!DWSIM_URL) return;
    void refresh();
    const timer = setInterval(() => void refresh(), intervalMs);
    return () => clearInterval(timer);
  }, [refresh, intervalMs]);
  return { health, checkedAt, refresh };
}
