import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import {
  ArrowLeft,
  Bath,
  BedDouble,
  Car,
  ChevronRight,
  Home,
  MapPin,
  Maximize2,
  MessageCircle,
  Ruler,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { LeadForm } from "@/components/public/LeadForm";
import { PropertyCard } from "@/components/public/PropertyCard";
import { PropertyDescription } from "@/components/public/PropertyDescription";
import { PropertyGallery } from "@/components/public/PropertyGallery";
import { TrackedWhatsAppLink } from "@/components/public/TrackedWhatsAppLink";
import {
  BROKER_INFO,
  PROPERTY_PURPOSE_LABELS,
  PROPERTY_TYPE_LABELS,
  buildPropertyWhatsAppMessage,
  buildWhatsAppUrl,
  formatArea,
  formatCurrency,
  getPublicWhatsAppFormatted,
} from "@/lib/format";
import {
  getCoverImageUrl,
  getPropertyBySlug,
  getPropertySlugByCode,
  getRelatedProperties,
} from "@/lib/properties";
import { buildRealEstateListingJsonLd, serializeJsonLd } from "@/lib/seo";

export const revalidate = 60;

interface PropertyDetailPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: PropertyDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const property = await getPropertyBySlug(slug);

  if (!property) {
    return {
      title: "Imóvel não encontrado",
      robots: { index: false, follow: false },
    };
  }

  const priceFormatted = formatCurrency(property.price);
  const purposeLabel =
    PROPERTY_PURPOSE_LABELS[property.purpose] ?? property.purpose;
  const locationParts = [
    property.condominium,
    property.neighborhood,
    property.city,
  ].filter(Boolean);
  const locationText = locationParts.join(", ");

  const pageTitle = `${property.title} — ${priceFormatted}`;
  const description = `${purposeLabel} em ${locationText || BROKER_INFO.region}. ${
    property.bedrooms > 0 ? `${property.bedrooms} quartos. ` : ""
  }${
    property.area_built
      ? `${property.area_built} m² construídos. `
      : property.area_total
        ? `${property.area_total} m² de terreno. `
        : ""
  }Cód. ${property.code} • ${BROKER_INFO.brandName} (CRECI ${BROKER_INFO.creci}).`;

  const coverUrl = getCoverImageUrl(property);

  return {
    title: pageTitle,
    description,
    alternates: {
      canonical: `/imoveis/${property.slug}`,
    },
    openGraph: {
      type: "website",
      locale: "pt_BR",
      url: `/imoveis/${property.slug}`,
      siteName: BROKER_INFO.brandName,
      title: `${property.title} | ${priceFormatted}`,
      description,
      images: coverUrl
        ? [
            {
              url: coverUrl,
              width: 1200,
              height: 630,
              alt: property.title,
            },
          ]
        : undefined,
    },
    twitter: {
      card: coverUrl ? "summary_large_image" : "summary",
      title: `${property.title} | ${priceFormatted}`,
      description,
      images: coverUrl ? [coverUrl] : undefined,
    },
  };
}

function extractTrailingPropertyCode(slug: string): number | null {
  const match = slug.match(/-(\d{1,9})$/);
  if (!match) return null;
  const code = Number.parseInt(match[1], 10);
  return Number.isSafeInteger(code) && code > 0 ? code : null;
}

export default async function PropertyDetailPage({
  params,
}: PropertyDetailPageProps) {
  const { slug } = await params;
  const property = await getPropertyBySlug(slug);

  if (!property) {
    const fallbackCode = extractTrailingPropertyCode(slug);
    if (fallbackCode !== null) {
      const canonicalSlug = await getPropertySlugByCode(fallbackCode);
      if (canonicalSlug && canonicalSlug !== slug) {
        permanentRedirect(`/imoveis/${canonicalSlug}`);
      }
    }
    notFound();
  }

  const relatedProperties = await getRelatedProperties(property, 3);

  const purposeLabel =
    PROPERTY_PURPOSE_LABELS[property.purpose] ?? property.purpose;
  const typeLabel = PROPERTY_TYPE_LABELS[property.type] ?? property.type;
  const areaBuiltLabel = formatArea(property.area_built);
  const areaTotalLabel = formatArea(property.area_total);

  const whatsappMessage = buildPropertyWhatsAppMessage(
    property.title,
    property.code,
  );
  const whatsappHref = buildWhatsAppUrl(whatsappMessage);
  const publicWhatsAppFormatted = getPublicWhatsAppFormatted();
  const listingJsonLd = buildRealEstateListingJsonLd(property);

  const locationBreadcrumb =
    property.condominium || property.neighborhood || property.city;

  const fullAddressParts = [
    property.address,
    property.condominium,
    property.neighborhood,
    property.city,
  ].filter((part): part is string => Boolean(part && part.trim().length > 0));

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(listingJsonLd) }}
      />
      {/* Breadcrumb */}
      <nav
        aria-label="Navegação estrutural"
        className="mb-6 flex flex-wrap items-center gap-1.5 text-xs text-muted"
      >
        <Link href="/" className="transition-colors hover:text-primary">
          Início
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href="/imoveis" className="transition-colors hover:text-primary">
          Imóveis
        </Link>
        {locationBreadcrumb && (
          <>
            <ChevronRight className="h-3.5 w-3.5" />
            <Link
              href={`/imoveis?location=${encodeURIComponent(locationBreadcrumb)}`}
              className="transition-colors hover:text-primary"
            >
              {locationBreadcrumb}
            </Link>
          </>
        )}
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="font-medium text-foreground">Cód. {property.code}</span>
      </nav>

      {/* Cabeçalho do Imóvel */}
      <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-primary px-2.5 py-1 text-xs font-semibold text-white">
              {purposeLabel}
            </span>
            <span className="rounded-md border border-border bg-surface px-2.5 py-1 text-xs font-medium text-foreground">
              {typeLabel}
            </span>
            <span className="rounded-md bg-accent/15 px-2.5 py-1 text-xs font-semibold text-primary">
              Cód. {property.code}
            </span>
          </div>

          <h1 className="mt-3 font-serif text-2xl font-semibold leading-tight text-primary sm:text-4xl">
            {property.title}
          </h1>

          {fullAddressParts.length > 0 && (
            <p className="mt-2 flex items-start gap-1.5 text-sm text-muted">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              <span>{fullAddressParts.join(" • ")}</span>
            </p>
          )}
        </div>

        <div className="lg:text-right">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            {property.purpose === "locacao" ? "Valor do aluguel" : "Valor de venda"}
          </p>
          <p className="text-3xl font-bold tracking-tight text-primary sm:text-4xl">
            {formatCurrency(property.price)}
            {property.purpose === "locacao" && property.price !== null && (
              <span className="text-base font-normal text-muted">/mês</span>
            )}
          </p>
        </div>
      </div>

      {/* Layout Principal: Galeria + Detalhes (esquerda) e Conversão (direita) */}
      <div className="grid gap-8 lg:grid-cols-12">
        {/* Coluna Esquerda (8 cols) */}
        <div className="space-y-8 lg:col-span-8">
          <PropertyGallery
            images={property.property_images}
            title={property.title}
          />

          {/* Destaques Rápidos */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {areaBuiltLabel && (
              <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-medium text-muted">
                  <Maximize2 className="h-4 w-4 text-accent" />
                  <span>Área construída</span>
                </div>
                <p className="mt-1.5 text-lg font-semibold text-foreground">
                  {areaBuiltLabel}
                </p>
              </div>
            )}

            {areaTotalLabel && (
              <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-medium text-muted">
                  <Ruler className="h-4 w-4 text-accent" />
                  <span>Área total</span>
                </div>
                <p className="mt-1.5 text-lg font-semibold text-foreground">
                  {areaTotalLabel}
                </p>
              </div>
            )}

            {property.bedrooms > 0 && (
              <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-medium text-muted">
                  <BedDouble className="h-4 w-4 text-accent" />
                  <span>Quartos</span>
                </div>
                <p className="mt-1.5 text-lg font-semibold text-foreground">
                  {property.bedrooms}
                  {property.suites > 0 && (
                    <span className="ml-1 text-xs font-normal text-muted">
                      ({property.suites}{" "}
                      {property.suites === 1 ? "suíte" : "suítes"})
                    </span>
                  )}
                </p>
              </div>
            )}

            {property.bathrooms > 0 && (
              <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-medium text-muted">
                  <Bath className="h-4 w-4 text-accent" />
                  <span>Banheiros</span>
                </div>
                <p className="mt-1.5 text-lg font-semibold text-foreground">
                  {property.bathrooms}
                </p>
              </div>
            )}

            {property.parking > 0 && (
              <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-medium text-muted">
                  <Car className="h-4 w-4 text-accent" />
                  <span>Vagas</span>
                </div>
                <p className="mt-1.5 text-lg font-semibold text-foreground">
                  {property.parking}
                </p>
              </div>
            )}
          </div>

          {/* Descrição do Imóvel */}
          {property.description && (
            <section className="rounded-2xl border border-border bg-surface p-6 shadow-sm sm:p-7">
              <h2 className="font-serif text-2xl font-semibold text-primary">
                Sobre este imóvel
              </h2>
              <PropertyDescription content={property.description} />
            </section>
          )}

          {/* Ficha Técnica Completa */}
          <section className="rounded-2xl border border-border bg-surface p-6 shadow-sm sm:p-7">
            <h2 className="font-serif text-2xl font-semibold text-primary">
              Ficha Técnica e Valores
            </h2>

            <dl className="mt-5 grid gap-x-8 gap-y-4 sm:grid-cols-2">
              <div className="flex items-center justify-between border-b border-border pb-3 text-sm">
                <dt className="text-muted">Código do imóvel</dt>
                <dd className="font-semibold text-foreground">
                  #{property.code}
                </dd>
              </div>

              <div className="flex items-center justify-between border-b border-border pb-3 text-sm">
                <dt className="text-muted">Finalidade</dt>
                <dd className="font-semibold text-foreground">{purposeLabel}</dd>
              </div>

              <div className="flex items-center justify-between border-b border-border pb-3 text-sm">
                <dt className="text-muted">Tipo</dt>
                <dd className="font-semibold text-foreground">{typeLabel}</dd>
              </div>

              <div className="flex items-center justify-between border-b border-border pb-3 text-sm">
                <dt className="text-muted">Valor</dt>
                <dd className="font-semibold text-primary">
                  {formatCurrency(property.price)}
                  {property.purpose === "locacao" && property.price !== null
                    ? "/mês"
                    : ""}
                </dd>
              </div>

              <div className="flex items-center justify-between border-b border-border pb-3 text-sm">
                <dt className="text-muted">Condomínio</dt>
                <dd className="font-semibold text-foreground">
                  {property.condo_fee !== null && property.condo_fee > 0
                    ? `${formatCurrency(property.condo_fee)}/mês`
                    : "Isento / Não informado"}
                </dd>
              </div>

              <div className="flex items-center justify-between border-b border-border pb-3 text-sm">
                <dt className="text-muted">IPTU</dt>
                <dd className="font-semibold text-foreground">
                  {property.iptu !== null && property.iptu > 0
                    ? `${formatCurrency(property.iptu)}/mês`
                    : "Não informado"}
                </dd>
              </div>

              {areaTotalLabel && (
                <div className="flex items-center justify-between border-b border-border pb-3 text-sm">
                  <dt className="text-muted">Área do terreno</dt>
                  <dd className="font-semibold text-foreground">
                    {areaTotalLabel}
                  </dd>
                </div>
              )}

              {areaBuiltLabel && (
                <div className="flex items-center justify-between border-b border-border pb-3 text-sm">
                  <dt className="text-muted">Área construída</dt>
                  <dd className="font-semibold text-foreground">
                    {areaBuiltLabel}
                  </dd>
                </div>
              )}

              {property.condominium && (
                <div className="flex items-center justify-between border-b border-border pb-3 text-sm">
                  <dt className="text-muted">Condomínio / Residencial</dt>
                  <dd className="font-semibold text-foreground">
                    {property.condominium}
                  </dd>
                </div>
              )}

              {property.neighborhood && (
                <div className="flex items-center justify-between border-b border-border pb-3 text-sm">
                  <dt className="text-muted">Bairro</dt>
                  <dd className="font-semibold text-foreground">
                    {property.neighborhood}
                  </dd>
                </div>
              )}

              <div className="flex items-center justify-between border-b border-border pb-3 text-sm">
                <dt className="text-muted">Cidade</dt>
                <dd className="font-semibold text-foreground">
                  {property.city}
                </dd>
              </div>

              {property.address && (
                <div className="flex items-start justify-between gap-4 border-b border-border pb-3 text-sm sm:col-span-2">
                  <dt className="shrink-0 text-muted">Endereço</dt>
                  <dd className="text-right font-semibold text-foreground">
                    {property.address}
                  </dd>
                </div>
              )}
            </dl>
          </section>
        </div>

        {/* Coluna Direita: Sidebar de Conversão (4 cols) */}
        <aside className="lg:col-span-4">
          <div className="sticky top-24 space-y-5">
            {/* Cartão WhatsApp + Formulário */}
            <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
              <div className="flex items-center gap-3 border-b border-border pb-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary font-serif text-base font-semibold text-accent">
                  MS
                </div>
                <div className="min-w-0">
                  <p className="truncate font-serif text-base font-semibold text-primary">
                    {BROKER_INFO.brokerName}
                  </p>
                  <p className="text-xs text-muted">
                    CRECI {BROKER_INFO.creci} • Atendimento direto
                  </p>
                </div>
              </div>

              {/* Conversão 1: WhatsApp */}
              <div className="mt-5">
                <TrackedWhatsAppLink
                  href={whatsappHref}
                  label="Detalhe Imovel WhatsApp"
                  propertyCode={property.code}
                  propertyTitle={property.title}
                  value={property.price}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-whatsapp px-4 py-3.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-whatsapp-hover"
                >
                  <MessageCircle className="h-5 w-5" />
                  <span>Chamar no WhatsApp</span>
                </TrackedWhatsAppLink>
                <p className="mt-2 text-center text-xs text-muted">
                  Resposta rápida pelo {publicWhatsAppFormatted}
                </p>
              </div>

              <div className="my-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs font-medium uppercase tracking-wide text-muted">
                  ou envie uma mensagem
                </span>
                <div className="h-px flex-1 bg-border" />
              </div>

              {/* Conversão 2: Formulário de Lead */}
              <LeadForm
                propertyId={property.id}
                propertyTitle={property.title}
                propertyCode={property.code}
                propertyPrice={property.price}
              />
            </div>

            {/* Selo de Segurança */}
            <div className="flex items-start gap-3 rounded-xl border border-border bg-surface p-4 text-xs text-muted">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <p className="leading-relaxed">
                Imóvel anunciado diretamente por{" "}
                <strong className="font-semibold text-foreground">
                  {BROKER_INFO.brandName}
                </strong>{" "}
                (CRECI {BROKER_INFO.creci}). Agende sua visita com segurança.
              </p>
            </div>
          </div>
        </aside>
      </div>

      {/* Imóveis Relacionados */}
      {relatedProperties.length > 0 && (
        <section className="mt-16 border-t border-border pt-12">
          <div className="flex items-end justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-accent">
                <Sparkles className="h-3.5 w-3.5" />
                Você também pode gostar
              </span>
              <h2 className="mt-1 font-serif text-2xl font-semibold text-primary">
                Outros imóveis disponíveis
              </h2>
            </div>

            <Link
              href="/imoveis"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary transition-colors hover:text-primary-hover"
            >
              <span>Ver todos</span>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {relatedProperties.map((item) => (
              <PropertyCard key={item.id} property={item} />
            ))}
          </div>
        </section>
      )}

      {/* Link Voltar */}
      <div className="mt-10 flex items-center justify-between border-t border-border pt-6">
        <Link
          href="/imoveis"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted transition-colors hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Voltar para a lista de imóveis</span>
        </Link>

        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-primary"
        >
          <Home className="h-4 w-4" />
          <span>Início</span>
        </Link>
      </div>
    </main>
  );
}
