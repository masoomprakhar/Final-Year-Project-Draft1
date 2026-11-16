export const PACKAGES = [
  { id: "steam", name: "IAPWS-IF97 steam tables", fit: "Pure water and steam", status: "Used by the mock water correlations below" },
  { id: "pr", name: "Peng-Robinson", fit: "Hydrocarbons, gases", status: "Available once a DWSIM service is connected" },
  { id: "nrtl", name: "NRTL", fit: "Non-ideal liquid mixtures", status: "Available once a DWSIM service is connected" },
  { id: "srk", name: "Soave-Redlich-Kwong", fit: "Gas processing", status: "Available once a DWSIM service is connected" },
] as const;

/** Mock water properties (liquid, ~1 atm) from standard engineering correlations. */
export function waterProperties(tC: number) {
  const density = 1000 * (1 - ((tC + 288.9414) / (508929.2 * (tC + 68.12963))) * (tC - 3.9863) ** 2);
  const viscosityMPas = 2.414e-2 * 10 ** (247.8 / (tC + 273.15 - 140));
  const cp = 4.2174 - 0.0036 * tC + 0.000063 * tC ** 2 - 0.0000003 * tC ** 3;
  const conductivity = 0.5706 + 0.001756 * tC - 0.00000646 * tC ** 2;
  return { t: tC, density, viscosityMPas, cp, conductivity };
}
