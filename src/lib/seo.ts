import {
  BROKER_INFO,
  PROPERTY_PURPOSE_LABELS,
  getPublicWhatsAppDigits,
} from "@/lib/format";
import type {
  ActiveCondominium,
  PublicPropertyWithImages,
} from "@/lib/properties";
import type { PropertyPurpose, PropertyType } from "@/types/database";

export function getSiteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(
    /\/+$/,
    "",
  );
}

/**
 * Remove sintaxe Markdown básica para uso limpo em meta tags e JSON-LD.
 */
export function stripMarkdown(text: string | null | undefined): string {
  if (!text) return "";

  return text
    .replace(/\r\n/g, "\n")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*•]\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*\n]+)\*/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

export function serializeJsonLd(data: Record<string, unknown>): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function buildRealEstateAgentJsonLd(): Record<string, unknown> {
  const siteUrl = getSiteUrl();
  const phoneDigits = getPublicWhatsAppDigits();

  return {
    "@context": "https://schema.org",
    "@type": "RealEstateAgent",
    name: BROKER_INFO.brandName,
    url: siteUrl,
    description: `Casas, apartamentos e terrenos em condomínios de Cotia e Granja Vianna (SP). Atendimento direto com ${BROKER_INFO.brokerName} — CRECI ${BROKER_INFO.creci}.`,
    telephone: `+${phoneDigits}`,
    email: BROKER_INFO.email,
    sameAs: [BROKER_INFO.instagramUrl],
    address: {
      "@type": "PostalAddress",
      addressLocality: "Cotia",
      addressRegion: "SP",
      addressCountry: "BR",
    },
    areaServed: [
      {
        "@type": "City",
        name: "Cotia",
      },
      {
        "@type": "Place",
        name: "Granja Vianna, Cotia - SP",
      },
    ],
    identifier: {
      "@type": "PropertyValue",
      name: "CRECI-SP",
      value: BROKER_INFO.creci,
    },
    contactPoint: {
      "@type": "ContactPoint",
      telephone: `+${phoneDigits}`,
      contactType: "sales",
      availableLanguage: ["Portuguese"],
      areaServed: "BR",
    },
  };
}

function mapPropertySchemaType(type: PropertyType): string {
  switch (type) {
    case "casa":
      return "SingleFamilyResidence";
    case "apartamento":
      return "Apartment";
    case "terreno":
      return "Landform";
    case "comercial":
    default:
      return "Place";
  }
}

export function buildRealEstateListingJsonLd(
  property: PublicPropertyWithImages,
): Record<string, unknown> {
  const siteUrl = getSiteUrl();
  const propertyUrl = `${siteUrl}/imoveis/${property.slug}`;
  const phoneDigits = getPublicWhatsAppDigits();
  const purposeLabel =
    PROPERTY_PURPOSE_LABELS[property.purpose] ?? property.purpose;

  const cleanDescription = stripMarkdown(property.description);
  const locationParts = [
    property.condominium,
    property.neighborhood,
    property.city,
  ].filter((part): part is string => Boolean(part && part.trim().length > 0));

  const fallbackDescription = `${purposeLabel} em ${locationParts.join(", ") || BROKER_INFO.region}. Código ${property.code}.`;
  const description = (cleanDescription || fallbackDescription).slice(0, 500);

  const images = property.property_images
    .map((img) => img.url)
    .filter((url): url is string => Boolean(url));

  const streetParts = [property.address, property.condominium].filter(
    (part): part is string => Boolean(part && part.trim().length > 0),
  );

  const areaValue =
    property.area_built && property.area_built > 0
      ? property.area_built
      : property.area_total && property.area_total > 0
        ? property.area_total
        : null;

  const mainEntity: Record<string, unknown> = {
    "@type": mapPropertySchemaType(property.type),
    name: property.title,
    address: {
      "@type": "PostalAddress",
      ...(streetParts.length > 0
        ? { streetAddress: streetParts.join(" — ") }
        : {}),
      addressLocality: property.city || "Cotia",
      addressRegion: "SP",
      addressCountry: "BR",
    },
  };

  if (property.bedrooms > 0) {
    mainEntity.numberOfBedrooms = property.bedrooms;
  }

  if (property.bathrooms > 0) {
    mainEntity.numberOfBathroomsTotal = property.bathrooms;
  }

  if (areaValue) {
    mainEntity.floorSize = {
      "@type": "QuantitativeValue",
      value: areaValue,
      unitCode: "MTK",
    };
  }

  const listing: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    name: property.title,
    url: propertyUrl,
    description,
    identifier: String(property.code),
    datePosted: property.created_at,
    dateModified: property.updated_at,
    ...(images.length > 0 ? { image: images } : {}),
    mainEntity,
    provider: {
      "@type": "RealEstateAgent",
      name: BROKER_INFO.brandName,
      url: siteUrl,
      telephone: `+${phoneDigits}`,
    },
  };

  if (property.price !== null && property.price > 0) {
    listing.offers = {
      "@type": "Offer",
      price: property.price,
      priceCurrency: "BRL",
      availability: "https://schema.org/InStock",
      url: propertyUrl,
      businessFunction:
        property.purpose === "locacao"
          ? "http://purl.org/goodrelations/v1#LeaseOut"
          : "http://purl.org/goodrelations/v1#Sell",
    };
  }

  return listing;
}

const PLURAL_TYPE_LABELS: Record<PropertyType, string> = {
  casa: "Casas",
  apartamento: "Apartamentos",
  terreno: "Terrenos",
  comercial: "Imóveis comerciais",
};

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function formatLocationPhrase(
  location: string,
  activeCondominiums: ActiveCondominium[],
): {
  inPhrase: string;
  withCity: string;
} {
  const trimmed = location.trim();
  const normalized = normalizeText(trimmed);

  const startsWithCondoPrefix =
    normalized.startsWith("condominio ") ||
    normalized.startsWith("residencial ");

  const matchedCondo = activeCondominiums.find((item) => {
    const normItem = normalizeText(item.name);
    return (
      normItem === normalized ||
      normItem.replace(/^(condominio|residencial)\s+/, "") === normalized
    );
  });

  if (startsWithCondoPrefix) {
    const label = matchedCondo ? matchedCondo.name : trimmed;
    const withCity = normalized.includes("cotia")
      ? `no ${label}`
      : `no ${label} em Cotia`;
    return { inPhrase: `no ${label}`, withCity };
  }

  if (matchedCondo) {
    const matchedNorm = normalizeText(matchedCondo.name);
    const label =
      matchedNorm.startsWith("condominio ") ||
      matchedNorm.startsWith("residencial ")
        ? matchedCondo.name
        : `Condomínio ${matchedCondo.name}`;
    return {
      inPhrase: `no ${label}`,
      withCity: `no ${label} em Cotia`,
    };
  }

  if (normalized === "cotia" || normalized.includes("cotia")) {
    return {
      inPhrase: `em ${trimmed}`,
      withCity: `em ${trimmed}`,
    };
  }

  return {
    inPhrase: `em ${trimmed}`,
    withCity: `em ${trimmed}, Cotia`,
  };
}

export interface ListingSeoCopy {
  title: string;
  heading: string;
  description: string;
}

export function formatListingSeoCopy(params: {
  purpose?: PropertyPurpose;
  type?: PropertyType;
  location?: string;
  activeCondominiums?: ActiveCondominium[];
}): ListingSeoCopy {
  const { purpose, type, location, activeCondominiums = [] } = params;

  const subject = type ? PLURAL_TYPE_LABELS[type] : "Imóveis";
  const purposeSuffix =
    purpose === "venda"
      ? " à venda"
      : purpose === "locacao"
        ? " para locação"
        : "";

  if (location && location.trim().length > 0) {
    const locationPhrase = formatLocationPhrase(location, activeCondominiums);
    const title = `${subject}${purposeSuffix} ${locationPhrase.withCity}`;
    const heading = `${subject}${purposeSuffix} ${locationPhrase.inPhrase}`;
    const description = `Confira ${subject.toLowerCase()}${purposeSuffix} disponíveis ${locationPhrase.withCity} (SP). Atendimento direto com ${BROKER_INFO.brokerName} — CRECI ${BROKER_INFO.creci}.`;

    return { title, heading, description };
  }

  const title = `${subject}${purposeSuffix} em Cotia e Granja Vianna`;
  const heading = title;
  const description =
    purpose || type
      ? `Confira ${subject.toLowerCase()}${purposeSuffix} em condomínios de Cotia e Granja Vianna (SP). ${BROKER_INFO.brandName} — CRECI ${BROKER_INFO.creci}.`
      : `Confira casas, apartamentos, terrenos e imóveis comerciais à venda e para locação em Cotia e Granja Vianna. ${BROKER_INFO.brandName} — CRECI ${BROKER_INFO.creci}.`;

  return { title, heading, description };
}
