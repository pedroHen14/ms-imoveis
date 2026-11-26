/**
 * Parsers numéricos compartilhados para formulários pt-BR (ex.: "450.000,00" ou "450000").
 */
export function parseOptionalDecimal(
  raw: FormDataEntryValue | null,
): number | null {
  if (raw === null) return null;
  const text = raw.toString().trim();
  if (!text) return null;

  const normalized =
    text.includes(",") && text.includes(".")
      ? text.replace(/\./g, "").replace(",", ".")
      : text.includes(",")
        ? text.replace(",", ".")
        : text;

  const num = Number(normalized);
  return Number.isFinite(num) ? num : Number.NaN;
}

export function parseOptionalNonNegativeDecimal(
  raw: FormDataEntryValue | null,
): number | null {
  const num = parseOptionalDecimal(raw);
  if (num === null || Number.isNaN(num) || num < 0) {
    return null;
  }
  return num;
}

export function parseIntField(
  raw: FormDataEntryValue | null,
  invalidFallback = -1,
): number {
  if (raw === null) return 0;
  const text = raw.toString().trim();
  if (!text) return 0;
  const num = Number.parseInt(text, 10);
  return Number.isFinite(num) ? num : invalidFallback;
}
