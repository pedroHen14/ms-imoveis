import Image from "next/image";
import Link from "next/link";
import {
  Bath,
  BedDouble,
  Building2,
  Car,
  MapPin,
  Maximize2,
  Star,
} from "lucide-react";
import {
  PROPERTY_PURPOSE_LABELS,
  PROPERTY_TYPE_LABELS,
  formatArea,
  formatCurrency,
} from "@/lib/format";
import {
  getCoverImageUrl,
  type PublicPropertyWithImages,
} from "@/lib/properties";

interface PropertyCardProps {
  property: PublicPropertyWithImages;
}

export function PropertyCard({ property }: PropertyCardProps) {
  const coverUrl = getCoverImageUrl(property);
  const purposeLabel =
    PROPERTY_PURPOSE_LABELS[property.purpose] ?? property.purpose;
  const typeLabel = PROPERTY_TYPE_LABELS[property.type] ?? property.type;
  const areaLabel = formatArea(property.area_built || property.area_total);

  const locationParts = [
    property.condominium,
    property.neighborhood,
    property.city,
  ].filter((part): part is string => Boolean(part && part.trim().length > 0));
  const locationText = locationParts.join(" • ");

  return (
    <Link
      href={`/imoveis/${property.slug}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
    >
      {/* Foto de Capa (4:3) */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-background">
        {coverUrl ? (
          <Image
            src={coverUrl}
            alt={property.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/15 text-primary/50">
            <Building2 className="h-10 w-10" />
            <span className="mt-2 text-xs font-medium">Fotos em breve</span>
          </div>
        )}

        {/* Badges superiores */}
        <div className="absolute left-3 top-3 flex flex-wrap items-center gap-1.5">
          <span className="rounded-md bg-primary px-2.5 py-1 text-xs font-semibold text-white shadow-sm">
            {purposeLabel}
          </span>
          <span className="rounded-md bg-surface/95 px-2.5 py-1 text-xs font-medium text-foreground shadow-sm backdrop-blur-sm">
            {typeLabel}
          </span>
        </div>

        {property.is_featured && (
          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-md bg-accent px-2.5 py-1 text-xs font-semibold text-white shadow-sm">
            <Star className="h-3 w-3 fill-current" />
            Destaque
          </span>
        )}

        <span className="absolute bottom-3 right-3 rounded-md bg-foreground/75 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur-sm">
          Cód. {property.code}
        </span>
      </div>

      {/* Conteúdo */}
      <div className="flex flex-1 flex-col p-5">
        {/* Preço */}
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-xl font-bold tracking-tight text-primary">
            {formatCurrency(property.price)}
            {property.purpose === "locacao" && property.price !== null && (
              <span className="text-sm font-normal text-muted">/mês</span>
            )}
          </p>
          {property.condo_fee !== null && property.condo_fee > 0 && (
            <span className="text-xs text-muted">
              Cond. {formatCurrency(property.condo_fee)}
            </span>
          )}
        </div>

        {/* Título */}
        <h3 className="mt-2 line-clamp-2 text-base font-semibold leading-snug text-foreground transition-colors group-hover:text-primary">
          {property.title}
        </h3>

        {/* Localização */}
        {locationText && (
          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-accent" />
            <span className="truncate">{locationText}</span>
          </p>
        )}

        {/* Especificações */}
        <div className="mt-auto pt-4">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border pt-3.5 text-xs font-medium text-muted">
            {areaLabel && (
              <span className="inline-flex items-center gap-1.5">
                <Maximize2 className="h-3.5 w-3.5 text-primary/70" />
                {areaLabel}
              </span>
            )}
            {property.bedrooms > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <BedDouble className="h-3.5 w-3.5 text-primary/70" />
                {property.bedrooms}{" "}
                {property.bedrooms === 1 ? "quarto" : "quartos"}
              </span>
            )}
            {property.bathrooms > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <Bath className="h-3.5 w-3.5 text-primary/70" />
                {property.bathrooms}{" "}
                {property.bathrooms === 1 ? "banh." : "banhs."}
              </span>
            )}
            {property.parking > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <Car className="h-3.5 w-3.5 text-primary/70" />
                {property.parking} {property.parking === 1 ? "vaga" : "vagas"}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
