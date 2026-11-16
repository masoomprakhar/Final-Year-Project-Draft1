// Copies the pure business logic from lib/ into supabase/functions/_shared/ with Deno-style
// imports. lib/ stays the single source of truth; run `npm run sync:edge` after editing it.
// The same modules can later move behind a Python/FastAPI service without changing their contract.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const FILES = [
  ["lib/format.ts", "format.ts"],
  ["lib/types.ts", "types.ts"],
  ["lib/simulation/mockHeatExchanger.ts", "mockHeatExchanger.ts"],
  ["lib/ml/mockModel.ts", "mockModel.ts"],
  ["lib/csv/parsePlantCsv.ts", "parsePlantCsv.ts"],
  ["lib/data/unitModels.ts", "unitModels.ts"],
  ["lib/flowsheet/flowsheetTypes.ts", "flowsheetTypes.ts"],
  ["lib/flowsheet/flowsheetCatalog.ts", "flowsheetCatalog.ts"],
  ["lib/flowsheet/flowsheetSolver.ts", "flowsheetSolver.ts"],
];
const OUT = "supabase/functions/_shared";
mkdirSync(OUT, { recursive: true });

for (const [from, to] of FILES) {
  const source = readFileSync(from, "utf8").replace(
    /from "@\/lib\/(?:[\w-]+\/)*([\w-]+)"/g,
    'from "./$1.ts"',
  );
  writeFileSync(`${OUT}/${to}`, `// GENERATED from ${from} by scripts/sync-edge-shared.mjs. Do not edit here.\n${source}`);
  console.log(`synced ${from} -> ${OUT}/${to}`);
}
