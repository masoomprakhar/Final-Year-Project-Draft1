"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { DwsimBadge } from "@/components/DwsimBadge";
import { useTwin } from "@/lib/store/TwinProvider";

const LINKS = [
  { href: "/", label: "Workbench" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/datasets", label: "Datasets" },
  { href: "/runs", label: "Runs" },
  { href: "/monitoring", label: "Monitoring" },
  { href: "/models", label: "ML Models" },
  { href: "/dynamics", label: "Dynamics" },
  { href: "/optimization", label: "Optimization" },
  { href: "/thermo", label: "Thermo" },
  { href: "/reports", label: "Reports" },
  { href: "/integrations", label: "Integrations" },
  { href: "/map", label: "Feature Map" },
];

export function PageFrame({ title, intro, children, fill = true }: { title: string; intro: string; children: ReactNode; fill?: boolean }) {
  const pathname = usePathname();
  const { backendEnabled, userEmail, setAuthOpen, signOut } = useTwin();
  return (
    <div className="flex h-full flex-col bg-[#f3f3f3] text-[#1d1d1d]">
      <header className="flex h-10 shrink-0 items-center gap-1 overflow-x-auto whitespace-nowrap border-b border-[#d0d0d0] bg-white px-3 text-[13px]">
        <span className="mr-3 grid h-5 w-5 place-items-center bg-[#1f4e79] text-[10px] font-bold text-white">S</span>
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`px-3 py-1 ${pathname === link.href ? "bg-[#d6ebfa] font-semibold text-[#1f4e79]" : "hover:bg-[#e7f2fb]"}`}
          >
            {link.label}
          </Link>
        ))}
        <span className="ml-auto" />
        <DwsimBadge />
        {backendEnabled && (
          <button
            type="button"
            onClick={() => (userEmail ? void signOut() : setAuthOpen(true))}
            className="h-7 border border-[#bbb] bg-white px-2 text-[12px] hover:bg-[#e7f1fb]"
          >
            {userEmail ? `${userEmail} · Sign out` : "Sign in"}
          </button>
        )}
      </header>
      <main key={pathname} className="fade-in min-h-0 flex-1 overflow-auto p-4">
        <h1 className="text-[18px] font-semibold">{title}</h1>
        <p className="mb-3 text-[13px] text-[#444]">{intro}</p>
        <div className={`${fill ? "h-[calc(100%-4rem)] min-h-[360px]" : ""} border border-[#d0d0d0] bg-white`}>{children}</div>
      </main>
    </div>
  );
}
