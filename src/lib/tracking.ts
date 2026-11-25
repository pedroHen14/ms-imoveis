declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    _fbq?: (...args: unknown[]) => void;
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

const META_PIXEL_ID_REGEX = /^\d{5,20}$/;
const GA_ID_REGEX = /^(G|AW|GT|DC)-[A-Z0-9]+$/i;

export function getValidMetaPixelId(): string | null {
  const raw = process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim();
  if (!raw || !META_PIXEL_ID_REGEX.test(raw)) {
    return null;
  }
  return raw;
}

export function getValidGaId(): string | null {
  const raw = process.env.NEXT_PUBLIC_GA_ID?.trim();
  if (!raw || !GA_ID_REGEX.test(raw)) {
    return null;
  }
  return raw;
}

export interface TrackLeadConversionParams {
  method: "whatsapp" | "form";
  label?: string;
  propertyCode?: number;
  propertyTitle?: string;
  value?: number | null;
}

export function trackLeadConversion(params: TrackLeadConversionParams): void {
  if (typeof window === "undefined") {
    return;
  }

  const contentName =
    params.propertyTitle || params.label || "Contato Vitrine";
  const hasValue = typeof params.value === "number" && params.value > 0;

  if (typeof window.fbq === "function") {
    const fbPayload: Record<string, unknown> = {
      content_name: contentName,
      content_category: params.method,
    };

    if (params.propertyCode !== undefined) {
      fbPayload.content_ids = [String(params.propertyCode)];
    }

    if (hasValue) {
      fbPayload.value = params.value;
      fbPayload.currency = "BRL";
    }

    try {
      window.fbq("track", "Lead", fbPayload);
    } catch {
      // Silencioso para nunca interromper a navegação do cliente
    }
  }

  if (typeof window.gtag === "function") {
    const gaPayload: Record<string, unknown> = {
      method: params.method,
      event_category: "conversion",
      event_label: contentName,
    };

    if (params.propertyCode !== undefined) {
      gaPayload.property_code = params.propertyCode;
    }

    if (hasValue) {
      gaPayload.value = params.value;
      gaPayload.currency = "BRL";
    }

    try {
      window.gtag("event", "generate_lead", gaPayload);
    } catch {
      // Silencioso para nunca interromper a navegação do cliente
    }
  }
}
