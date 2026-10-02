"use client";

import { PROJECT_TITLE } from "@/lib/project";
import { useTwin } from "@/lib/store/TwinProvider";

export function TitleBar() {
  const { notify } = useTwin();

  return (
    <header className="flex h-8 shrink-0 items-center justify-between border-b border-[#d0d0d0] bg-[#f3f3f3] pl-2">
      <div className="flex min-w-0 flex-1 items-center gap-2 pr-2 text-[12px] text-[#1d1d1d]">
        <span className="grid h-4 w-4 shrink-0 place-items-center bg-[#1f4e79] text-[9px] font-bold text-white">
          S
        </span>
        <span className="truncate" title={PROJECT_TITLE}>
          {PROJECT_TITLE}
        </span>
      </div>
      <div className="flex h-full">
        {["—", "□", "✕"].map((glyph) => (
          <button
            key={glyph}
            type="button"
            title="Window controls are drawn to match the desktop frame"
            onClick={() =>
              notify("Window controls are part of the frame. They do not change the flowsheet.")
            }
            className="grid h-full w-11 place-items-center text-[12px] text-[#333] hover:bg-[#e5e5e5]"
          >
            {glyph}
          </button>
        ))}
      </div>
    </header>
  );
}
