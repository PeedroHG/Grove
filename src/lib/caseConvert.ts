/**
 * Local Drizzle rows use camelCase JS keys; PostgREST (Supabase's REST
 * layer) speaks the actual snake_case Postgres column names verbatim — it
 * has no idea Drizzle exists on either end. Every row crossing the wire
 * goes through one of these two conversions, never ad hoc.
 */
export function toSnakeCaseKeys<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
    out[snakeKey] = value instanceof Date ? value.toISOString() : value;
  }
  return out;
}

export function toCamelCaseKeys<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
    out[camelKey] = value;
  }
  return out;
}
