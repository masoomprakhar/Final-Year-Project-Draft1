"use client";

import { useTwin } from "@/lib/store/TwinProvider";

/** Shown instead of a stored-data panel when there is nothing to query yet. Returns null when signed in. */
export function StoredNotice() {
  const { backendEnabled, userEmail, setAuthOpen } = useTwin();
  if (backendEnabled && userEmail) return null;

  return (
    <div className="grid h-full place-items-center bg-white px-6 text-center text-[12px] text-[#444]">
      {!backendEnabled ? (
        <p>
          Supabase is not configured. Set <code>NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
          <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to store datasets, runs and alerts.
        </p>
      ) : (
        <div>
          <p className="mb-2">Sign in to see your stored datasets, runs and alerts.</p>
          <button
            type="button"
            onClick={() => setAuthOpen(true)}
            className="h-7 border border-[#1f4e79] px-3 font-semibold text-[#1f4e79] hover:bg-[#e7f1fb]"
          >
            Sign in
          </button>
        </div>
      )}
    </div>
  );
}
