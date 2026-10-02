const COLORS: Record<string, string> = {
  Converged: "bg-[#e7f6ec] text-[#0f7a32]",
  Running: "bg-[#e7f1fb] text-[#1d4ed8]",
  Queued: "bg-[#f3f4f6] text-[#374151]",
  Failed: "bg-[#fdecec] text-[#b42318]",
  Stopped: "bg-[#f3f4f6] text-[#374151]",
  Idle: "bg-[#f3f4f6] text-[#374151]",
  NORMAL: "bg-[#e7f6ec] text-[#0f7a32]",
  WARNING: "bg-[#fff4d6] text-[#8a5a00]",
  ANOMALY: "bg-[#fdecec] text-[#b42318]",
};

export function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-[2px] px-1.5 py-0.5 text-[11px] font-semibold ${COLORS[status] ?? "bg-[#f3f4f6] text-[#374151]"}`}
    >
      {status}
    </span>
  );
}
