export const BROKER_INFO = {
  brandName: "Marcelo Santos Negócios Imobiliários",
  shortBrandName: "Marcelo Santos",
  brokerName: "Marcelo Santos",
  creci: "295730",
  region: "Cotia e Granja Vianna (SP)",
  whatsappDigits: "5511966332122",
  whatsappFormatted: "(11) 96633-2122",
  email: "ms.imoveis04@gmail.com",
  instagram: "@ms.imoveis04",
  instagramUrl: "https://instagram.com/ms.imoveis04",
} as const;

export const PROPERTY_TYPE_LABELS: Record<string, string> = {
  casa: "Casa",
  apartamento: "Apartamento",
  terreno: "Terreno",
  comercial: "Comercial",
};

export const PROPERTY_PURPOSE_LABELS: Record<string, string> = {
  venda: "Venda",
  locacao: "Locação",
};

export function formatArea(value: number | null | undefined): string | null {
  if (value === null || value === undefined || Number.isNaN(value) || value <= 0) {
    return null;
  }

  return `${new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 0,
  }).format(value)} m²`;
}

export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "Sob consulta";
  }

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPhoneBR(value: string | null | undefined): string {
  if (!value) return "";
  const digits = value.replace(/\D/g, "");
  const local = digits.startsWith("55") && digits.length >= 12 ? digits.slice(2) : digits;

  if (local.length === 11) {
    return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`;
  }
  if (local.length === 10) {
    return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`;
  }

  return value;
}

export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function buildPropertySlug(params: {
  title: string;
  condominium?: string | null;
  city?: string | null;
  code?: number | null;
}): string {
  const parts = [
    params.title,
    params.condominium,
    params.city ?? "Cotia",
    params.code ? String(params.code) : undefined,
  ].filter((part): part is string => Boolean(part && part.trim().length > 0));

  return slugify(parts.join(" "));
}

export function normalizePhoneE164(value: string | null | undefined): string {
  if (!value) return "";
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }
  return digits;
}

export function buildPhoneCandidates(value: string | null | undefined): string[] {
  if (!value) return [];
  const digits = value.replace(/\D/g, "");
  if (!digits) return [];

  const e164 = normalizePhoneE164(digits);
  const local =
    e164.startsWith("55") && e164.length >= 12 ? e164.slice(2) : e164;

  return Array.from(new Set([e164, local, digits].filter(Boolean)));
}

export function formatShortDateTimeBR(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "";

  const parts = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/Sao_Paulo",
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";

  return `${get("day")}/${get("month")} ${get("hour")}:${get("minute")}`;
}

export function getPublicWhatsAppDigits(): string {
  const configured = process.env.NEXT_PUBLIC_WHATSAPP_BOT_NUMBER?.trim();
  if (configured) {
    const digits = configured.replace(/\D/g, "");
    if (digits.length >= 10) {
      return normalizePhoneE164(digits);
    }
  }
  return BROKER_INFO.whatsappDigits;
}

export function getPublicWhatsAppFormatted(): string {
  return formatPhoneBR(getPublicWhatsAppDigits()) || BROKER_INFO.whatsappFormatted;
}

export function buildPropertyWhatsAppMessage(
  title: string,
  code: number,
): string {
  return `Olá! Vi o imóvel ${title} (Cód. ${code}) no site e gostaria de mais informações.`;
}

export function buildWhatsAppUrl(
  message: string,
  phoneDigits: string = getPublicWhatsAppDigits(),
): string {
  const cleanDigits = phoneDigits.replace(/\D/g, "");
  const fallbackDigits = BROKER_INFO.whatsappDigits;
  const effectiveDigits = cleanDigits.length >= 10 ? cleanDigits : fallbackDigits;
  const normalizedDigits = normalizePhoneE164(effectiveDigits);
  return `https://wa.me/${normalizedDigits}?text=${encodeURIComponent(message)}`;
}
