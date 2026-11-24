"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Search, SlidersHorizontal } from "lucide-react";

export const PRICE_RANGES = [
  { value: "", label: "Qualquer valor" },
  { value: "0-350000", label: "Até R$ 350 mil", min: undefined, max: 350000 },
  {
    value: "350000-600000",
    label: "R$ 350 mil a R$ 600 mil",
    min: 350000,
    max: 600000,
  },
  {
    value: "600000-1000000",
    label: "R$ 600 mil a R$ 1 milhão",
    min: 600000,
    max: 1000000,
  },
  {
    value: "1000000-",
    label: "Acima de R$ 1 milhão",
    min: 1000000,
    max: undefined,
  },
] as const;

interface PropertySearchBarProps {
  initialPurpose?: string;
  initialType?: string;
  initialLocation?: string;
  initialMinPrice?: number;
  initialMaxPrice?: number;
  initialSort?: string;
  availableLocations?: string[];
  variant?: "hero" | "listing";
}

function getInitialPriceRangeValue(
  minPrice?: number,
  maxPrice?: number,
): string {
  if (minPrice === undefined && maxPrice === undefined) return "";
  const match = PRICE_RANGES.find(
    (range) =>
      "min" in range && range.min === minPrice && range.max === maxPrice,
  );
  return match ? match.value : "";
}

export function PropertySearchBar({
  initialPurpose = "",
  initialType = "",
  initialLocation = "",
  initialMinPrice,
  initialMaxPrice,
  initialSort = "",
  availableLocations = [],
  variant = "hero",
}: PropertySearchBarProps) {
  const router = useRouter();

  const [purpose, setPurpose] = useState(initialPurpose);
  const [type, setType] = useState(initialType);
  const [location, setLocation] = useState(initialLocation);
  const [priceRange, setPriceRange] = useState(() =>
    getInitialPriceRangeValue(initialMinPrice, initialMaxPrice),
  );

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const params = new URLSearchParams();
    if (purpose) params.set("purpose", purpose);
    if (type) params.set("type", type);
    if (location.trim()) params.set("location", location.trim());

    const selectedRange = PRICE_RANGES.find((r) => r.value === priceRange);
    if (selectedRange && "min" in selectedRange) {
      if (selectedRange.min !== undefined) {
        params.set("minPrice", String(selectedRange.min));
      }
      if (selectedRange.max !== undefined) {
        params.set("maxPrice", String(selectedRange.max));
      }
    }

    if (initialSort && variant === "listing") {
      params.set("sort", initialSort);
    }

    const queryString = params.toString();
    router.push(queryString ? `/imoveis?${queryString}` : "/imoveis");
  }

  const inputBaseClass =
    "h-11 w-full rounded-lg border border-border bg-background px-3.5 text-sm text-foreground transition-colors focus:border-primary focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary/15";

  const selectBaseClass = `${inputBaseClass} appearance-none cursor-pointer pr-10`;

  return (
    <form
      onSubmit={handleSubmit}
      className={`rounded-xl border border-border bg-surface p-4 sm:p-5 ${
        variant === "hero" ? "shadow-xl" : "shadow-sm"
      }`}
    >
      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-12">
        {/* Finalidade */}
        <div className="lg:col-span-2">
          <label
            htmlFor={`purpose-${variant}`}
            className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted"
          >
            Finalidade
          </label>
          <div className="relative">
            <select
              id={`purpose-${variant}`}
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className={selectBaseClass}
            >
              <option value="">Todas</option>
              <option value="venda">Venda</option>
              <option value="locacao">Locação</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          </div>
        </div>

        {/* Tipo */}
        <div className="lg:col-span-2">
          <label
            htmlFor={`type-${variant}`}
            className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted"
          >
            Tipo
          </label>
          <div className="relative">
            <select
              id={`type-${variant}`}
              value={type}
              onChange={(e) => setType(e.target.value)}
              className={selectBaseClass}
            >
              <option value="">Todos</option>
              <option value="casa">Casa</option>
              <option value="apartamento">Apartamento</option>
              <option value="terreno">Terreno</option>
              <option value="comercial">Comercial</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          </div>
        </div>

        {/* Bairro ou Condomínio */}
        <div className="lg:col-span-3">
          <label
            htmlFor={`location-${variant}`}
            className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted"
          >
            Bairro ou Condomínio
          </label>
          <input
            id={`location-${variant}`}
            type="text"
            list={`locations-list-${variant}`}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Ex: Terra Nobre, Granja Vianna..."
            className={inputBaseClass}
          />
          {availableLocations.length > 0 && (
            <datalist id={`locations-list-${variant}`}>
              {availableLocations.map((loc) => (
                <option key={loc} value={loc} />
              ))}
            </datalist>
          )}
        </div>

        {/* Faixa de Preço */}
        <div className="lg:col-span-3">
          <label
            htmlFor={`price-${variant}`}
            className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted"
          >
            Faixa de Preço
          </label>
          <div className="relative">
            <select
              id={`price-${variant}`}
              value={priceRange}
              onChange={(e) => setPriceRange(e.target.value)}
              className={selectBaseClass}
            >
              {PRICE_RANGES.map((range) => (
                <option key={range.value || "all"} value={range.value}>
                  {range.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          </div>
        </div>

        {/* Botão Buscar */}
        <div className="flex items-end sm:col-span-2 lg:col-span-2">
          <button
            type="submit"
            className="inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-hover"
          >
            {variant === "hero" ? (
              <Search className="h-4 w-4" />
            ) : (
              <SlidersHorizontal className="h-4 w-4" />
            )}
            <span>{variant === "hero" ? "Buscar" : "Filtrar"}</span>
          </button>
        </div>
      </div>
    </form>
  );
}
