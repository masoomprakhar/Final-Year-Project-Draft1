"use client";

import { useEffect } from "react";

/** Adds a ripple under the pointer on any button click. One document listener, no per-button code. */
export function Ripple() {
  useEffect(() => {
    function onDown(event: PointerEvent) {
      const button = (event.target as HTMLElement | null)?.closest("button");
      if (!button || (button as HTMLButtonElement).disabled) return;
      const rect = button.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height) * 2;
      const dot = document.createElement("span");
      dot.className = "ripple";
      dot.style.width = dot.style.height = `${size}px`;
      dot.style.left = `${event.clientX - rect.left - size / 2}px`;
      dot.style.top = `${event.clientY - rect.top - size / 2}px`;
      button.classList.add("ripple-host");
      button.appendChild(dot);
      dot.addEventListener("animationend", () => dot.remove());
    }
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, []);
  return null;
}
