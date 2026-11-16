"use client";

import type { ReactNode } from "react";
import { QuickGuide } from "@/components/QuickGuide";
import { Ripple } from "@/components/Ripple";
import { Toasts } from "@/components/Toasts";
import { AuthDialog } from "@/components/dialogs/AuthDialog";
import { FlowsheetProvider } from "@/lib/store/FlowsheetProvider";
import { TwinProvider } from "@/lib/store/TwinProvider";

/** One provider tree for every page, so the open dataset and sign-in survive navigation. */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <TwinProvider>
      <FlowsheetProvider>
        <Ripple />
        <Toasts />
        <QuickGuide />
        {children}
        <AuthDialog />
      </FlowsheetProvider>
    </TwinProvider>
  );
}
