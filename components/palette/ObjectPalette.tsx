"use client";

import {
  Box,
  ChevronDown,
  ChevronRight,
  CircleDot,
  Cylinder,
  Droplets,
  Fan,
  Filter,
  Flame,
  FlaskConical,
  Gauge,
  GitBranch,
  Layers,
  Search,
  Snowflake,
  Thermometer,
  X,
  Zap,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { useTwin } from "@/lib/store/TwinProvider";
import type { ObjectId } from "@/lib/types";

type PaletteItem = {
  name: string;
  icon: LucideIcon;
  objectId?: ObjectId;
};

const STREAMS: PaletteItem[] = [
  { name: "Material Stream", icon: Droplets, objectId: "S1" },
  { name: "Energy Stream", icon: Zap },
];

const UNITS: PaletteItem[] = [
  { name: "Mixer", icon: GitBranch },
  { name: "Splitter", icon: GitBranch },
  { name: "Heat Exchanger", icon: Layers, objectId: "E-1" },
  { name: "Reactor", icon: FlaskConical },
  { name: "Distillation Column", icon: Cylinder },
  { name: "Pump", icon: Fan, objectId: "P-1" },
  { name: "Compressor", icon: Gauge },
  { name: "Valve", icon: Filter },
  { name: "Flash Drum", icon: Cylinder },
  { name: "Separator", icon: Layers },
  { name: "Heater", icon: Flame },
  { name: "Cooler", icon: Snowflake },
];

const EXTRA: { title: string; items: PaletteItem[] }[] = [
  {
    title: "Utilities",
    items: [
      { name: "Cooling Water Utility", icon: Droplets },
      { name: "Steam Utility", icon: Thermometer },
    ],
  },
  {
    title: "Reactions",
    items: [{ name: "Reaction Set", icon: FlaskConical }],
  },
  {
    title: "Subflowsheets",
    items: [{ name: "Subflowsheet", icon: Box }],
  },
  {
    title: "Macros",
    items: [{ name: "Script", icon: CircleDot }],
  },
  {
    title: "Tools",
    items: [{ name: "Spreadsheet", icon: Layers }],
  },
];

function matches(name: string, query: string) {
  return name.toLowerCase().includes(query.trim().toLowerCase());
}

export function ObjectPalette() {
  const twin = useTwin();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(true);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const selectedId = twin.selection.kind === "object" ? twin.selection.id : null;

  const visibleExtras = useMemo(
    () =>
      EXTRA.map((group) => ({
        ...group,
        items: group.items.filter((item) => matches(item.name, query) || matches(group.title, query)),
      })).filter((group) => query.trim() === "" || group.items.length > 0 || matches(group.title, query)),
    [query],
  );

  function choose(item: PaletteItem) {
    if (item.name === "Pump") {
      const next = selectedId === "P-1" ? "P-2" : "P-1";
      twin.selectObject(next);
      return;
    }
    if (item.name === "Material Stream") {
      twin.selectObject("S1");
      twin.notify("Material stream S1 selected. Click a stream box to choose S2, S3, or S4.");
      return;
    }
    if (item.objectId) {
      twin.selectObject(item.objectId);
      return;
    }
    twin.selectUnavailable(item.name);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-7 shrink-0 border-r border-[#d0d0d0] bg-[#f7f7f7] text-[11px] text-[#243042]"
      >
        <span className="inline-block rotate-180 [writing-mode:vertical-rl]">Object Palette</span>
      </button>
    );
  }

  const streamItems = STREAMS.filter((item) => matches(item.name, query));
  const unitItems = UNITS.filter((item) => matches(item.name, query));

  return (
    <aside className="flex w-[228px] shrink-0 flex-col border-r border-[#d0d0d0] bg-[#f7f7f7]">
      <div className="flex h-8 items-center justify-between border-b border-[#e1e1e1] bg-[#f3f3f3] px-2">
        <span className="text-[12px] font-semibold">Object Palette</span>
        <button type="button" title="Collapse palette" onClick={() => setOpen(false)} className="text-[#555]">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="border-b border-[#e1e1e1] p-2">
        <label className="flex h-7 items-center gap-1.5 border border-[#c8c8c8] bg-white px-2">
          <Search className="h-3.5 w-3.5 text-[#6b7280]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search unit operations..."
            className="w-full bg-transparent text-[12px] outline-none"
          />
        </label>
      </div>
      <div className="min-h-0 flex-1 overflow-auto py-1">
        <Section title="Streams" forceOpen={query.trim() !== ""}>
          {streamItems.map((item) => (
            <PaletteRow
              key={item.name}
              item={item}
              selected={item.name === "Material Stream" && (selectedId === "S1" || selectedId === "S2" || selectedId === "S3" || selectedId === "S4")}
              onClick={() => choose(item)}
            />
          ))}
        </Section>
        <Section title="Unit Operations" forceOpen={query.trim() !== ""}>
          {unitItems.map((item) => (
            <PaletteRow
              key={item.name}
              item={item}
              selected={
                (item.name === "Heat Exchanger" && selectedId === "E-1") ||
                (item.name === "Pump" && (selectedId === "P-1" || selectedId === "P-2"))
              }
              onClick={() => choose(item)}
            />
          ))}
        </Section>
        {visibleExtras.map((group) => {
          const expanded = query.trim() !== "" || collapsed[group.title] === false;
          return (
            <div key={group.title}>
              <button
                type="button"
                onClick={() =>
                  setCollapsed((current) => ({
                    ...current,
                    [group.title]: current[group.title] === false,
                  }))
                }
                className="flex w-full items-center gap-1 px-2 py-1 text-left text-[12px] font-semibold hover:bg-[#e7f2fb]"
              >
                {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                {group.title}
              </button>
              {expanded &&
                group.items.map((item) => (
                  <PaletteRow key={item.name} item={item} selected={false} onClick={() => choose(item)} />
                ))}
            </div>
          );
        })}
      </div>
    </aside>
  );
}

function Section({
  title,
  children,
  forceOpen,
}: {
  title: string;
  children: React.ReactNode;
  forceOpen?: boolean;
}) {
  const [open, setOpen] = useState(true);
  const shown = forceOpen || open;
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-1 px-2 py-1 text-left text-[12px] font-semibold hover:bg-[#e7f2fb]"
      >
        {shown ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        {title}
      </button>
      {shown && <div>{children}</div>}
    </div>
  );
}

function PaletteRow({
  item,
  selected,
  onClick,
}: {
  item: PaletteItem;
  selected: boolean;
  onClick: () => void;
}) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2 px-3 py-1 text-left text-[12px] ${
        selected ? "bg-[#d6ebfa] text-[#1f4e79]" : "hover:bg-[#e7f2fb]"
      }`}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.7} />
      <span>{item.name}</span>
    </button>
  );
}
