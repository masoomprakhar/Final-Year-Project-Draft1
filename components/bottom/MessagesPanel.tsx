"use client";

import { useEffect, useRef } from "react";
import { useTwin } from "@/lib/store/TwinProvider";

const COLOR = {
  info: "text-[#1f2933]",
  success: "text-[#0f7a32]",
  warning: "text-[#8a5a00]",
  error: "text-[#b42318]",
};

export function MessagesPanel() {
  const { messages } = useTwin();
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  return (
    <div className="h-full overflow-auto bg-white px-3 py-2 font-mono text-[12px]">
      {messages.length === 0 ? (
        <p className="text-[#666]">No messages.</p>
      ) : (
        messages.map((message) => (
          <div key={message.id} className={`py-0.5 ${COLOR[message.level]}`}>
            <span className="mr-2 text-[#888]">{message.time}</span>
            {message.text}
          </div>
        ))
      )}
      <div ref={endRef} />
    </div>
  );
}
