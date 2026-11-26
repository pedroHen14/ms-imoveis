export type RawSearchParams = Record<string, string | string[] | undefined>;

export function getSearchParam(
  value: string | string[] | undefined,
): string {
  if (Array.isArray(value)) {
    return (value[0] ?? "").trim();
  }
  return (value ?? "").trim();
}

export function parsePageParam(
  value: string | string[] | undefined,
  maxPage = 500,
): number {
  const raw = getSearchParam(value);
  if (!raw) return 1;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return Math.min(maxPage, parsed);
}

/**
 * Remove caracteres que quebram ou manipulam expressões `.or(...)` do PostgREST
 * e limita o comprimento para buscas administrativas seguras.
 */
export function sanitizePostgrestSearch(value: string): string {
  return value
    .replace(/[%_*,"'\\()[\]{}\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}
