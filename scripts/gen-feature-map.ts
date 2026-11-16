import { writeFileSync } from "node:fs";
import { FEATURES } from "../lib/featureMap";

const rows = FEATURES.map((f) => `| ${f.area} | ${f.name} | ${f.status} | ${f.route ?? "—"} | \`${f.where}\` | ${f.note} |`);
writeFileSync(
  "docs/FEATURE_MAP.md",
  `# Feature map\n\nGenerated from \`lib/featureMap.ts\` (\`npm run docs:map\`). **Live** = real behaviour; **Mock** = working UI with placeholder data or physics; **Planned** = not built.\n\n| Area | Feature | Status | Page | Code | Note |\n|---|---|---|---|---|---|\n${rows.join("\n")}\n`,
);
