"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown } from "lucide-react";

interface PropertySortSelectProps {
  currentSort: string;
}

export function PropertySortSelect({ currentSort }: PropertySortSelectProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "recentes") {
      params.set("sort", value);
    } else {
      params.delete("sort");
    }
    params.delete("page");
    const qs = params.toString();
    router.push(qs ? `/imoveis?${qs}` : "/imoveis");
  }

  return (
    <div className="flex items-center gap-2">
      <label
        htmlFor="property-sort"
        className="whitespace-nowrap text-xs font-medium text-muted"
      >
        Ordenar por:
      </label>
      <div className="relative">
        <select
          id="property-sort"
          value={currentSort}
          onChange={(e) => handleChange(e.target.value)}
          className="h-9 cursor-pointer appearance-none rounded-lg border border-border bg-surface pl-3 pr-9 text-sm text-foreground transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
        >
          <option value="recentes">Mais recentes</option>
          <option value="menor-preco">Menor preço</option>
          <option value="maior-preco">Maior preço</option>
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
      </div>
    </div>
  );
}
