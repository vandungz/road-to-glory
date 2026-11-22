/** A squad slot is a canonical decimal URL segment, never a numeric prefix. */
export function parseSquadSlot(value: string): number | null {
  return /^(?:[0-9]|10)$/.test(value) ? Number(value) : null;
}
/** PostgreSQL UUID syntax, checked before authentication or database access. */
export function isGameId(value: string): boolean {
  return /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(value);
}

