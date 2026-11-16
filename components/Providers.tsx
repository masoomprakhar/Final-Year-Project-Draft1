"use client";

import type { ReactNode } from "react";
import { Ripple } from "@/components/Ripple";
import { AuthDialog } from "@/components/dialogs/AuthDialog";
import { FlowsheetProvider } from "@/lib/store/FlowsheetProvider";
import { TwinProvider } from "@/lib/store/TwinProvider";

/** One provider tree for every page, so the open dataset and sign-in survive navigation. */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <TwinProvider>
      <FlowsheetProvider>
        <Ripple />
        {children}
        <AuthDialog />
      </FlowsheetProvider>
    </TwinProvider>
  );
}
