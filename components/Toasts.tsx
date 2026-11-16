"use client";

import { useEffect, useRef, useState } from "react";
import { useTwin } from "@/lib/store/TwinProvider";
import type { AppMessage } from "@/lib/types";

const STYLE: Record<AppMessage["level"], string> = {
  info: "border-[#2b7cd3] bg-[#eef6fe]",
  success: "border-[#1f8a3b] bg-[#e9f7ee]",
  warning: "border-[#c28a00] bg-[#fff6dc]",
  error: "border-[#b42318] bg-[#fdecea]",
};
const ICON = { info: "ℹ", success: "✓", warning: "!", error: "✕" } as const;

/** Pops the newest messages up where you are looking, so you do not have to open the Messages tab. */
export function Toasts() {
  const { messages } = useTwin();
  const [shown, setShown] = useState<AppMessage[]>([]);
  const seen = useRef<string | null>(null);
  const first = useRef(true);

  useEffect(() => {
    const last = messages.at(-1);
    if (!last || last.id === seen.current) return;
    seen.current = last.id;
    if (first.current) {
      first.current = false; // skip the startup message
      return;
    }
    setShown((current) => [...current.slice(-2), last]);
    const timer = setTimeout(() => setShown((current) => current.filter((m) => m.id !== last.id)), last.level === "error" ? 8000 : 4500);
    return () => clearTimeout(timer);
  }, [messages]);

  if (shown.length === 0) return null;
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[340px] flex-col gap-2" aria-live="polite">
      {shown.map((m) => (
        <button
          key={m.id}
          type="button"
          onClick={() => setShown((current) => current.filter((x) => x.id !== m.id))}
          className={`toast pointer-events-auto flex items-start gap-2 border-l-4 px-3 py-2 text-left text-[12px] shadow-lg ${STYLE[m.level]}`}
        >
          <span className="font-bold">{ICON[m.level]}</span>
          <span>{m.text}</span>
        </button>
      ))}
    </div>
  );
}
