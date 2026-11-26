import { cache } from "react";
import { unstable_cache } from "next/cache";
import {
  createClient as createSupabaseClient,
  type SupabaseClient,
} from "@supabase/supabase-js";
import { getSupabasePublicEnv } from "@/lib/supabase/env";
import {
  PUBLIC_PROPERTY_SELECT,
  type Database,
  type PropertyImage,
  type PropertyPurpose,
  type PropertyType,
  type PublicProperty,
} from "@/types/database";

export const PROPERTIES_CACHE_TAG = "properties";

let cachedPublicClient: SupabaseClient<Database> | null = null;
let cachedPublicClientKey: string | null = null;

function createPublicClient(): SupabaseClient<Database> | null {
  const env = getSupabasePublicEnv();
  if (!env) return null;

  const cacheKey = `${env.url}::${env.anonKey}`;
  if (cachedPublicClient && cachedPublicClientKey === cacheKey) {
    return cachedPublicClient;
  }

  cachedPublicClient = createSupabaseClient<Database>(env.url, env.anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  cachedPublicClientKey = cacheKey;
  return cachedPublicClient;
}

export interface PublicPropertyWithImages extends PublicProperty {
  property_images: PropertyImage[];
}

export type PropertySortOption = "recentes" | "menor-preco" | "maior-preco";

export interface PropertyFilterParams {
  purpose?: PropertyPurpose;
  type?: PropertyType;
  location?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: PropertySortOption;
  page?: number;
  pageSize?: number;
}

export interface PaginatedPropertiesResult {
  properties: PublicPropertyWithImages[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasError?: boolean;
}

const PROPERTY_WITH_IMAGES_SELECT = `${PUBLIC_PROPERTY_SELECT}, property_images ( id, property_id, url, position, created_at )`;

function sortPropertyImages(
  items: PublicPropertyWithImages[],
): PublicPropertyWithImages[] {
  return items.map((property) => ({
    ...property,
    property_images: [...(property.property_images ?? [])].sort(
      (a, b) => a.position - b.position,
    ),
  }));
}

export function getCoverImageUrl(
  property: Pick<PublicPropertyWithImages, "property_images">,
): string | null {
  if (!property.property_images || property.property_images.length === 0) {
    return null;
  }
  const sorted = [...property.property_images].sort(
    (a, b) => a.position - b.position,
  );
  return sorted[0]?.url ?? null;
}

function sanitizeSearchFilter(value: string): string {
  return value
    .replace(/[%_*,"'\\()[\]{}\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

export async function getFeaturedProperties(
  limit = 6,
): Promise<PublicPropertyWithImages[]> {
  const supabase = createPublicClient();
  if (!supabase) {
    return [];
  }

  try {
    const { data: featured, error } = await supabase
      .from("properties")
      .select(PROPERTY_WITH_IMAGES_SELECT)
      .eq("status", "disponivel")
      .eq("is_featured", true)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Erro ao buscar imóveis em destaque:", error.message);
      return [];
    }

    const items = (featured ?? []) as unknown as PublicPropertyWithImages[];

    if (items.length > 0) {
      return sortPropertyImages(items);
    }

    // Fallback: se nenhum imóvel estiver marcado como destaque, mostra os mais recentes disponíveis
    const { data: latest, error: latestError } = await supabase
      .from("properties")
      .select(PROPERTY_WITH_IMAGES_SELECT)
      .eq("status", "disponivel")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (latestError) {
      console.error("Erro ao buscar imóveis recentes:", latestError.message);
      return [];
    }

    return sortPropertyImages(
      (latest ?? []) as unknown as PublicPropertyWithImages[],
    );
  } catch (err) {
    console.error("Falha ao consultar imóveis em destaque:", err);
    return [];
  }
}

export async function getFilteredProperties(
  params: PropertyFilterParams,
): Promise<PaginatedPropertiesResult> {
  const pageSize = Math.min(48, Math.max(1, params.pageSize ?? 12));
  const page = Math.min(500, Math.max(1, params.page ?? 1));

  const supabase = createPublicClient();
  if (!supabase) {
    return {
      properties: [],
      total: 0,
      page,
      pageSize,
      totalPages: 0,
    };
  }

  const cleanedLocation = params.location
    ? sanitizeSearchFilter(params.location)
    : "";
  const minPrice =
    typeof params.minPrice === "number" && !Number.isNaN(params.minPrice)
      ? params.minPrice
      : null;
  const maxPrice =
    typeof params.maxPrice === "number" && !Number.isNaN(params.maxPrice)
      ? params.maxPrice
      : null;

  try {
    // Usa RPC `search_public_properties` (Migration 004) com `unaccent` + índice GIN trigram.
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      "search_public_properties",
      {
        p_purpose: params.purpose ?? null,
        p_type: params.type ?? null,
        p_location: cleanedLocation || null,
        p_min_price: minPrice,
        p_max_price: maxPrice,
        p_sort: params.sort ?? "recentes",
        p_page: page,
        p_page_size: pageSize,
      },
    );

    if (!rpcError) {
      const rows = rpcData ?? [];
      const total = rows.length > 0 ? Number(rows[0].total_count ?? 0) : 0;
      const totalPages = Math.ceil(total / pageSize);

      const properties: PublicPropertyWithImages[] = rows.map((row) => {
        const rawImages = Array.isArray(row.property_images)
          ? (row.property_images as unknown as PropertyImage[])
          : [];
        const { total_count: _totalCount, ...rest } = row;
        void _totalCount;
        return {
          ...rest,
          property_images: rawImages,
        };
      });

      return {
        properties: sortPropertyImages(properties),
        total,
        page,
        pageSize,
        totalPages,
      };
    }

    const isMissingRpc =
      rpcError.code === "PGRST202" ||
      rpcError.message.toLowerCase().includes("search_public_properties");

    if (!isMissingRpc) {
      console.error("Erro ao listar imóveis via RPC:", rpcError.message);
      return {
        properties: [],
        total: 0,
        page,
        pageSize,
        totalPages: 0,
        hasError: true,
      };
    }

    console.warn(
      "[getFilteredProperties] RPC search_public_properties não encontrada; usando consulta padrão até aplicar a Migration 004.",
    );

    let query = supabase
      .from("properties")
      .select(PROPERTY_WITH_IMAGES_SELECT, { count: "exact" })
      .eq("status", "disponivel");

    if (params.purpose) {
      query = query.eq("purpose", params.purpose);
    }

    if (params.type) {
      query = query.eq("type", params.type);
    }

    if (cleanedLocation.length > 0) {
      query = query.or(
        `condominium.ilike.%${cleanedLocation}%,neighborhood.ilike.%${cleanedLocation}%,city.ilike.%${cleanedLocation}%,title.ilike.%${cleanedLocation}%`,
      );
    }

    if (minPrice !== null) {
      query = query.gte("price", minPrice);
    }

    if (maxPrice !== null) {
      query = query.lte("price", maxPrice);
    }

    switch (params.sort) {
      case "menor-preco":
        query = query
          .order("price", { ascending: true, nullsFirst: false })
          .order("created_at", { ascending: false });
        break;
      case "maior-preco":
        query = query
          .order("price", { ascending: false, nullsFirst: false })
          .order("created_at", { ascending: false });
        break;
      case "recentes":
      default:
        query = query
          .order("is_featured", { ascending: false })
          .order("created_at", { ascending: false });
        break;
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, count, error } = await query;

    if (error) {
      console.error("Erro ao listar imóveis:", error.message);
      return {
        properties: [],
        total: 0,
        page,
        pageSize,
        totalPages: 0,
        hasError: true,
      };
    }

    const total = count ?? 0;
    const totalPages = Math.ceil(total / pageSize);

    return {
      properties: sortPropertyImages(
        (data ?? []) as unknown as PublicPropertyWithImages[],
      ),
      total,
      page,
      pageSize,
      totalPages,
    };
  } catch (err) {
    console.error("Falha ao listar imóveis:", err);
    return {
      properties: [],
      total: 0,
      page,
      pageSize,
      totalPages: 0,
      hasError: true,
    };
  }
}

export interface ActiveCondominium {
  name: string;
  count: number;
  neighborhood: string | null;
}

interface AvailableLocationsIndex {
  condominiums: ActiveCondominium[];
  locations: string[];
}

async function fetchAvailableLocationsIndex(): Promise<AvailableLocationsIndex> {
  const supabase = createPublicClient();
  if (!supabase) {
    return { condominiums: [], locations: [] };
  }

  const { data, error } = await supabase
    .from("properties")
    .select("condominium, neighborhood")
    .eq("status", "disponivel");

  if (error) {
    throw new Error(error.message);
  }

  const grouped = new Map<string, ActiveCondominium>();
  const locationSet = new Set<string>();

  for (const row of data ?? []) {
    const condoName = row.condominium?.trim();
    const neighborhood = row.neighborhood?.trim() || null;

    if (condoName) {
      locationSet.add(condoName);

      const key = condoName
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();

      const existing = grouped.get(key);
      if (existing) {
        existing.count += 1;
        if (!existing.neighborhood && neighborhood) {
          existing.neighborhood = neighborhood;
        }
      } else {
        grouped.set(key, {
          name: condoName,
          count: 1,
          neighborhood,
        });
      }
    }

    if (neighborhood) {
      locationSet.add(neighborhood);
    }
  }

  const condominiums = Array.from(grouped.values()).sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return a.name.localeCompare(b.name, "pt-BR");
  });

  const locations = Array.from(locationSet).sort((a, b) =>
    a.localeCompare(b, "pt-BR"),
  );

  return { condominiums, locations };
}

const getCachedAvailableLocationsIndex = unstable_cache(
  fetchAvailableLocationsIndex,
  ["available-property-locations-v1"],
  {
    revalidate: 60,
    tags: [PROPERTIES_CACHE_TAG],
  },
);

const getAvailableLocationsIndex = cache(
  async (): Promise<AvailableLocationsIndex> => {
    if (!getSupabasePublicEnv()) {
      return { condominiums: [], locations: [] };
    }

    try {
      return await getCachedAvailableLocationsIndex();
    } catch (err) {
      console.error("Erro ao consultar localizações disponíveis:", err);
      return { condominiums: [], locations: [] };
    }
  },
);

export async function getActiveCondominiums(
  limit = 12,
): Promise<ActiveCondominium[]> {
  const { condominiums } = await getAvailableLocationsIndex();
  return condominiums.slice(0, limit);
}

export async function getAvailableLocations(): Promise<string[]> {
  const { locations } = await getAvailableLocationsIndex();
  return locations;
}

export const getPropertyBySlug = cache(async function getPropertyBySlug(
  slug: string,
): Promise<PublicPropertyWithImages | null> {
  const supabase = createPublicClient();
  if (!supabase) {
    return null;
  }

  try {
    const { data, error } = await supabase
      .from("properties")
      .select(PROPERTY_WITH_IMAGES_SELECT)
      .eq("slug", slug)
      .eq("status", "disponivel")
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    const [sorted] = sortPropertyImages([
      data as unknown as PublicPropertyWithImages,
    ]);
    return sorted ?? null;
  } catch (err) {
    console.error("Erro ao buscar imóvel por slug:", err);
    return null;
  }
});

export const getPropertySlugByCode = cache(async function getPropertySlugByCode(
  code: number,
): Promise<string | null> {
  if (!Number.isInteger(code) || code <= 0) {
    return null;
  }

  const supabase = createPublicClient();
  if (!supabase) {
    return null;
  }

  try {
    const { data, error } = await supabase
      .from("properties")
      .select("slug")
      .eq("code", code)
      .eq("status", "disponivel")
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return data.slug;
  } catch {
    return null;
  }
});

export async function getRelatedProperties(
  property: Pick<PublicProperty, "id" | "purpose" | "type">,
  limit = 3,
): Promise<PublicPropertyWithImages[]> {
  const supabase = createPublicClient();
  if (!supabase) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from("properties")
      .select(PROPERTY_WITH_IMAGES_SELECT)
      .eq("status", "disponivel")
      .eq("purpose", property.purpose)
      .neq("id", property.id)
      .order("is_featured", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error || !data) {
      return [];
    }

    return sortPropertyImages(
      data as unknown as PublicPropertyWithImages[],
    );
  } catch {
    return [];
  }
}

export async function getAllAvailablePropertySlugs(): Promise<
  Array<{ slug: string; updated_at: string }>
> {
  const supabase = createPublicClient();
  if (!supabase) {
    return [];
  }

  try {
    // Cliente stateless sem cookies para compatibilidade com sitemap.ts
    const { data, error } = await supabase
      .from("properties")
      .select("slug, updated_at")
      .eq("status", "disponivel")
      .order("updated_at", { ascending: false });

    if (error || !data) {
      return [];
    }

    return data;
  } catch {
    return [];
  }
}
