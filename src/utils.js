export const clone = (value) =>
  typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value));

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}
