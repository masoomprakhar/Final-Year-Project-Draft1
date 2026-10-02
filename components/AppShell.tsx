"use client";

import { useEffect } from "react";
import { BottomPanel } from "@/components/bottom/BottomPanel";
import { UploadDialog } from "@/components/dialogs/UploadDialog";
import { FlowsheetCanvas } from "@/components/flowsheet/FlowsheetCanvas";
import { ObjectPalette } from "@/components/palette/ObjectPalette";
import { PropertiesPanel } from "@/components/properties/PropertiesPanel";
import { MenuBar } from "@/components/shell/MenuBar";
import { Ribbon } from "@/components/shell/Ribbon";
import { TitleBar } from "@/components/shell/TitleBar";
import { TwinProvider, useTwin } from "@/lib/store/TwinProvider";

function Workspace() {
  const { setMenu } = useTwin();

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setMenu(null);
    }
    function onPointer(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      if (!target?.closest("[data-menu-root]")) setMenu(null);
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onPointer);
    };
  }, [setMenu]);

  return (
    <div className="h-full overflow-auto">
      <div className="flex h-full min-h-[720px] min-w-[1180px] flex-col bg-[#e6e6e6] text-[#1d1d1d]">
        <TitleBar />
        <div data-menu-root>
          <MenuBar />
        </div>
        <Ribbon />
        <div className="flex min-h-0 flex-1">
          <ObjectPalette />
          <div className="flex min-w-0 flex-1 flex-col">
            <FlowsheetCanvas />
            <BottomPanel />
          </div>
          <PropertiesPanel />
        </div>
        <UploadDialog />
      </div>
    </div>
  );
}

export function AppShell() {
  return (
    <TwinProvider>
      <Workspace />
    </TwinProvider>
  );
}
