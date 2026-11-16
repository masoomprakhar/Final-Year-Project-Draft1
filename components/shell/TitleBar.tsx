"use client";

import Link from "next/link";
import { PROJECT_TITLE } from "@/lib/project";
import { useTwin } from "@/lib/store/TwinProvider";

export function TitleBar() {
  const { notify, backendEnabled, userEmail, setAuthOpen, signOut } = useTwin();

  return (
    <header className="flex h-8 shrink-0 items-center justify-between border-b border-[#d0d0d0] bg-[#f3f3f3] pl-2">
      <div className="flex min-w-0 flex-1 items-center gap-2 pr-2 text-[12px] text-[#1d1d1d]">
        <span className="grid h-4 w-4 shrink-0 place-items-center bg-[#1f4e79] text-[9px] font-bold text-white">
          S
        </span>
        <span className="truncate" title={PROJECT_TITLE}>
          {PROJECT_TITLE}
        </span>
        <nav className="ml-3 flex gap-1 text-[11px]">
          {[["/datasets", "Datasets"], ["/runs", "Runs"], ["/monitoring", "Monitoring"], ["/models", "ML Models"]].map(([href, label]) => (
            <Link key={href} href={href} className="border border-transparent px-2 py-0.5 hover:border-[#bbb] hover:bg-white">
              {label}
            </Link>
          ))}
        </nav>
      </div>
      {backendEnabled && (
        <button
          type="button"
          onClick={() => (userEmail ? void signOut() : setAuthOpen(true))}
          title={userEmail ? "Sign out" : "Sign in to save datasets, runs and alerts"}
          className="mr-2 h-6 self-center border border-[#bbb] bg-white px-2 text-[11px] hover:bg-[#e7f1fb]"
        >
          {userEmail ? `${userEmail} · Sign out` : "Sign in"}
        </button>
      )}
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
