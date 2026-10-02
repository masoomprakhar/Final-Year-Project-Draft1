"use client";

import { useEffect, useRef, useState } from "react";

export function NumberField({
  value,
  onCommit,
  step = "0.1",
}: {
  value: number;
  onCommit: (value: number) => void;
  step?: string;
}) {
  const [text, setText] = useState(() => String(value));
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) setText(String(value));
  }, [value]);

  return (
    <input
      type="number"
      step={step}
      value={text}
      onFocus={() => {
        focused.current = true;
      }}
      onBlur={() => {
        focused.current = false;
        const parsed = Number(text);
        if (Number.isFinite(parsed)) onCommit(parsed);
        else setText(String(value));
      }}
      onChange={(event) => {
        const raw = event.target.value;
        setText(raw);
        const parsed = Number(raw);
        if (raw.trim() !== "" && Number.isFinite(parsed)) onCommit(parsed);
      }}
      className="h-[22px] w-full border border-[#c5c5c5] bg-white px-1 text-right text-[12px] outline-none focus:border-[#2b7cd3]"
    />
  );
}
