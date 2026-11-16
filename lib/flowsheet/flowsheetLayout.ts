import type { FlowStream, FlowUnit } from "@/lib/flowsheet/flowsheetTypes";

export const UNIT_WIDTH = 124;
export const UNIT_HEIGHT = 64;
const COLUMN_GAP = 230;
const ROW_GAP = 120;
const LEFT = 190;
const TOP = 90;

/** Left-to-right layers by longest path from the feeds; units in a layer are stacked and centred. */
export function autoLayout(units: FlowUnit[], streams: FlowStream[]): Record<string, { x: number; y: number }> {
  const ids = new Set(units.map((u) => u.id));
  const parents = new Map<string, string[]>(units.map((u) => [u.id, []]));
  for (const stream of streams) {
    if (stream.fromUnitId && stream.toUnitId && ids.has(stream.fromUnitId) && ids.has(stream.toUnitId)) {
      parents.get(stream.toUnitId)!.push(stream.fromUnitId);
    }
  }

  const depth = new Map<string, number>();
  const visiting = new Set<string>();
  const depthOf = (id: string): number => {
    if (depth.has(id)) return depth.get(id)!;
    if (visiting.has(id)) return 0; // recycle: break the loop
    visiting.add(id);
    const value = parents.get(id)!.reduce((max, parent) => Math.max(max, depthOf(parent) + 1), 0);
    visiting.delete(id);
    depth.set(id, value);
    return value;
  };

  const layers = new Map<number, FlowUnit[]>();
  for (const unit of units) {
    const d = depthOf(unit.id);
    layers.set(d, [...(layers.get(d) ?? []), unit]);
  }

  const positions: Record<string, { x: number; y: number }> = {};
  const tallest = Math.max(1, ...[...layers.values()].map((layer) => layer.length));
  const centre = TOP + ((tallest - 1) * ROW_GAP) / 2;
  for (const [d, layer] of layers) {
    layer.forEach((unit, index) => {
      positions[unit.id] = {
        x: LEFT + d * COLUMN_GAP,
        y: centre + (index - (layer.length - 1) / 2) * ROW_GAP,
      };
    });
  }
  return positions;
}
