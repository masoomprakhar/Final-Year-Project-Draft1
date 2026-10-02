export function round(value: number, digits: number) {
  if (!Number.isFinite(value)) return value;
  const power = 10 ** digits;
  return Math.round((value + Number.EPSILON) * power) / power;
}

export function formatNumber(value: number, digits: number) {
  if (!Number.isFinite(value)) return "—";
  return value.toFixed(digits);
}

export function formatSigned(value: number, digits: number) {
  if (!Number.isFinite(value)) return "—";
  const text = formatNumber(value, digits);
  return value > 0 ? `+${text}` : text;
}

export function formatComposition(value: number) {
  if (!Number.isFinite(value)) return "—";
  const tenths = Math.abs(value * 10 - Math.round(value * 10));
  return tenths < 1e-6 ? value.toFixed(1) : value.toFixed(3);
}
