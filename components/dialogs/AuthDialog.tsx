"use client";

import { useState } from "react";
import { useTwin } from "@/lib/store/TwinProvider";

export function AuthDialog() {
  const { authOpen, setAuthOpen, signIn, signUp } = useTwin();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  if (!authOpen) return null;

  async function submit(mode: "in" | "up") {
    setBusy(true);
    setError("");
    setNote("");
    const result = mode === "in" ? await signIn(email, password) : await signUp(email, password);
    setBusy(false);
    if (!result.ok) return setError(result.error);
    if (mode === "up" && "needsConfirmation" in result && result.needsConfirmation) {
      return setNote("Account created. Check your email to confirm it, then sign in.");
    }
    setPassword("");
    setAuthOpen(false);
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-6">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void submit("in");
        }}
        className="w-[380px] border border-[#c8c8c8] bg-white shadow-[0_16px_40px_rgba(0,0,0,0.18)]"
      >
        <div className="flex items-center justify-between border-b border-[#e5e5e5] bg-[#f7f7f7] px-3 py-2">
          <h2 className="text-[13px] font-semibold">Sign in to save your work</h2>
          <button type="button" onClick={() => setAuthOpen(false)} className="px-2 text-[14px]">
            ✕
          </button>
        </div>
        <div className="space-y-2 px-4 py-3 text-[12px]">
          <p className="text-[#444]">
            Datasets, runs, ML predictions and alerts are stored per account. Without signing in, the
            app keeps working on local sample data.
          </p>
          <label className="block">
            <span className="mb-0.5 block text-[#555]">Email</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-8 w-full border border-[#bbb] px-2"
            />
          </label>
          <label className="block">
            <span className="mb-0.5 block text-[#555]">Password</span>
            <input
              type="password"
              required
              minLength={6}
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-8 w-full border border-[#bbb] px-2"
            />
          </label>
          {error && <p className="text-[#b42318]">{error}</p>}
          {note && <p className="text-[#0f7a32]">{note}</p>}
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={busy}
              className="h-8 border border-[#1f4e79] bg-[#1f4e79] px-3 font-semibold text-white disabled:opacity-50"
            >
              Sign in
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void submit("up")}
              className="h-8 border border-[#1f4e79] px-3 font-semibold text-[#1f4e79] hover:bg-[#e7f1fb] disabled:opacity-50"
            >
              Create account
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
