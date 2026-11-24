import type { Metadata } from "next";
import Link from "next/link";
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  RotateCcw,
} from "lucide-react";
import { PropertyCard } from "@/components/public/PropertyCard";
import { PropertySearchBar } from "@/components/public/PropertySearchBar";
import { PropertySortSelect } from "@/components/public/PropertySortSelect";
import {
  BROKER_INFO,
  PROPERTY_PURPOSE_LABELS,
  PROPERTY_TYPE_LABELS,
  buildWhatsAppUrl,
  formatCurrency,
} from "@/lib/format";
import {
  getAvailableLocations,
  getFilteredProperties,
  type PropertySortOption,
} from "@/lib/properties";
import type { PropertyPurpose, PropertyType } from "@/types/database";

export const metadata: Metadata = {
  title: "Imóveis em Cotia e Granja Vianna",
  description: `Confira casas, apartamentos, terrenos e imóveis comerciais à venda e para locação em Cotia e Granja Vianna. ${BROKER_INFO.brandName} — CRECI ${BROKER_INFO.creci}.`,
};

interface ImoveisPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function getStringParam(
  value: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value?.trim() || undefined;
}

function parseNumberParam(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const num = Number(value);
  return Number.isFinite(num) && num >= 0 ? num : undefined;
}

const VALID_PURPOSES = new Set<PropertyPurpose>(["venda", "locacao"]);
const VALID_TYPES = new Set<PropertyType>([
  "casa",
  "apartamento",
  "terreno",
  "comercial",
]);
const VALID_SORTS = new Set<PropertySortOption>([
  "recentes",
  "menor-preco",
  "maior-preco",
]);

export default async function ImoveisPage({ searchParams }: ImoveisPageProps) {
  const rawParams = await searchParams;

  const rawPurpose = getStringParam(rawParams.purpose);
  const purpose =
    rawPurpose && VALID_PURPOSES.has(rawPurpose as PropertyPurpose)
      ? (rawPurpose as PropertyPurpose)
      : undefined;

  const rawType = getStringParam(rawParams.type);
  const type =
    rawType && VALID_TYPES.has(rawType as PropertyType)
      ? (rawType as PropertyType)
      : undefined;

  const location = getStringParam(rawParams.location);
  const minPrice = parseNumberParam(getStringParam(rawParams.minPrice));
  const maxPrice = parseNumberParam(getStringParam(rawParams.maxPrice));

  const rawSort = getStringParam(rawParams.sort);
  const sort: PropertySortOption =
    rawSort && VALID_SORTS.has(rawSort as PropertySortOption)
      ? (rawSort as PropertySortOption)
      : "recentes";

  const page = Math.max(1, Math.floor(parseNumberParam(getStringParam(rawParams.page)) ?? 1));

  const [result, availableLocations] = await Promise.all([
    getFilteredProperties({
      purpose,
      type,
      location,
      minPrice,
      maxPrice,
      sort,
      page,
      pageSize: 12,
    }),
    getAvailableLocations(),
  ]);

  const hasActiveFilters = Boolean(
    purpose ||
      type ||
      location ||
      minPrice !== undefined ||
      maxPrice !== undefined,
  );

  function buildPageHref(targetPage: number): string {
    const params = new URLSearchParams();
    if (purpose) params.set("purpose", purpose);
    if (type) params.set("type", type);
    if (location) params.set("location", location);
    if (minPrice !== undefined) params.set("minPrice", String(minPrice));
    if (maxPrice !== undefined) params.set("maxPrice", String(maxPrice));
    if (sort !== "recentes") params.set("sort", sort);
    if (targetPage > 1) params.set("page", String(targetPage));
    const qs = params.toString();
    return qs ? `/imoveis?${qs}` : "/imoveis";
  }

  const filterSummaryChips: string[] = [];
  if (purpose) filterSummaryChips.push(PROPERTY_PURPOSE_LABELS[purpose]);
  if (type) filterSummaryChips.push(PROPERTY_TYPE_LABELS[type]);
  if (location) filterSummaryChips.push(`Local: ${location}`);
  if (minPrice !== undefined && maxPrice !== undefined) {
    filterSummaryChips.push(
      `${formatCurrency(minPrice)} a ${formatCurrency(maxPrice)}`,
    );
  } else if (minPrice !== undefined) {
    filterSummaryChips.push(`A partir de ${formatCurrency(minPrice)}`);
  } else if (maxPrice !== undefined) {
    filterSummaryChips.push(`Até ${formatCurrency(maxPrice)}`);
  }

  const customWhatsApp = buildWhatsAppUrl(
    "Olá Marcelo, estou procurando um imóvel em Cotia / Granja Vianna e gostaria da sua ajuda para encontrar opções.",
  );

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-12">
      {/* Cabeçalho da Página */}
      <div className="mb-8">
        <span className="text-xs font-semibold uppercase tracking-wider text-accent">
          Carteira de Imóveis
        </span>
        <h1 className="mt-1 font-serif text-3xl font-semibold text-primary sm:text-4xl">
          Imóveis em Cotia e Granja Vianna
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted sm:text-base">
          Use os filtros abaixo para encontrar casas, apartamentos e terrenos
          disponíveis nos condomínios da região.
        </p>
      </div>

      {/* Barra de Filtros */}
      <PropertySearchBar
        key={`${purpose ?? ""}-${type ?? ""}-${location ?? ""}-${minPrice ?? ""}-${maxPrice ?? ""}`}
        initialPurpose={purpose ?? ""}
        initialType={type ?? ""}
        initialLocation={location ?? ""}
        initialMinPrice={minPrice}
        initialMaxPrice={maxPrice}
        initialSort={sort}
        availableLocations={availableLocations}
        variant="listing"
      />

      {/* Resumo de Resultados + Ordenação */}
      <div className="mt-6 flex flex-col items-start justify-between gap-4 border-b border-border pb-4 sm:flex-row sm:items-center">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium text-foreground">
            {result.total === 0
              ? "Nenhum imóvel encontrado"
              : result.total === 1
                ? "1 imóvel disponível"
                : `${result.total} imóveis disponíveis`}
          </p>

          {filterSummaryChips.map((chip) => (
            <span
              key={chip}
              className="rounded-full border border-primary/20 bg-primary/5 px-2.5 py-0.5 text-xs font-medium text-primary"
            >
              {chip}
            </span>
          ))}

          {hasActiveFilters && (
            <Link
              href="/imoveis"
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium text-muted transition-colors hover:bg-border/40 hover:text-foreground"
            >
              <RotateCcw className="h-3 w-3" />
              Limpar filtros
            </Link>
          )}
        </div>

        <PropertySortSelect currentSort={sort} />
      </div>

      {/* Grade de Imóveis */}
      {result.properties.length > 0 ? (
        <>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {result.properties.map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>

          {/* Paginação */}
          {result.totalPages > 1 && (
            <nav
              aria-label="Paginação de imóveis"
              className="mt-12 flex items-center justify-center gap-2"
            >
              {result.page > 1 ? (
                <Link
                  href={buildPageHref(result.page - 1)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3.5 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary hover:text-primary"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span>Anterior</span>
                </Link>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3.5 py-2 text-sm font-medium text-muted/50">
                  <ChevronLeft className="h-4 w-4" />
                  <span>Anterior</span>
                </span>
              )}

              <span className="px-3 text-sm font-medium text-muted">
                Página {result.page} de {result.totalPages}
              </span>

              {result.page < result.totalPages ? (
                <Link
                  href={buildPageHref(result.page + 1)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3.5 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary hover:text-primary"
                >
                  <span>Próxima</span>
                  <ChevronRight className="h-4 w-4" />
                </Link>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3.5 py-2 text-sm font-medium text-muted/50">
                  <span>Próxima</span>
                  <ChevronRight className="h-4 w-4" />
                </span>
              )}
            </nav>
          )}
        </>
      ) : (
        <div className="mt-10 rounded-xl border border-dashed border-border bg-surface px-6 py-14 text-center">
          <Building2 className="mx-auto h-11 w-11 text-primary/40" />
          <h2 className="mt-4 font-serif text-xl font-semibold text-foreground">
            Nenhum imóvel encontrado com esses filtros
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">
            Tente ampliar a faixa de preço ou limpar os filtros. Se preferir,
            chame o Marcelo no WhatsApp — muitos imóveis entram na carteira
            antes mesmo de irem ao site.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {hasActiveFilters && (
              <Link
                href="/imoveis"
                className="inline-flex items-center gap-2 rounded-lg border border-primary bg-surface px-4 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary hover:text-white"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Ver todos os imóveis</span>
              </Link>
            )}

            <a
              href={customWhatsApp}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-whatsapp px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-whatsapp-hover"
            >
              <MessageCircle className="h-4 w-4" />
              <span>Falar com o Marcelo no WhatsApp</span>
            </a>
          </div>
        </div>
      )}
    </main>
  );
}
