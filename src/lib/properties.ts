import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getSupabasePublicEnv } from "@/lib/supabase/env";
import {
  PUBLIC_PROPERTY_SELECT,
  type Database,
  type PropertyImage,
  type PropertyPurpose,
  type PropertyType,
  type PublicProperty,
} from "@/types/database";

function createPublicClient() {
  const env = getSupabasePublicEnv();
  if (!env) return null;
  return createSupabaseClient<Database>(env.url, env.anonKey);
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
  return value.replace(/[%_,()]/g, " ").trim();
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
  const pageSize = params.pageSize ?? 12;
  const page = Math.max(1, params.page ?? 1);

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

  try {
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

    if (params.location) {
      const cleaned = sanitizeSearchFilter(params.location);
      if (cleaned.length > 0) {
        query = query.or(
          `condominium.ilike.%${cleaned}%,neighborhood.ilike.%${cleaned}%,city.ilike.%${cleaned}%,title.ilike.%${cleaned}%`,
        );
      }
    }

    if (typeof params.minPrice === "number" && !Number.isNaN(params.minPrice)) {
      query = query.gte("price", params.minPrice);
    }

    if (typeof params.maxPrice === "number" && !Number.isNaN(params.maxPrice)) {
      query = query.lte("price", params.maxPrice);
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
    };
  }
}

export async function getAvailableLocations(): Promise<string[]> {
  const supabase = createPublicClient();
  if (!supabase) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from("properties")
      .select("condominium, neighborhood")
      .eq("status", "disponivel");

    if (error || !data) {
      return [];
    }

    const set = new Set<string>();
    for (const row of data) {
      if (row.condominium?.trim()) set.add(row.condominium.trim());
      if (row.neighborhood?.trim()) set.add(row.neighborhood.trim());
    }

    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
  } catch {
    return [];
  }
}

export async function getPropertyBySlug(
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
}

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
  const env = getSupabasePublicEnv();
  if (!env) {
    return [];
  }

  try {
    // Cliente stateless sem cookies para compatibilidade com sitemap.ts
    const supabase = createSupabaseClient<Database>(env.url, env.anonKey);
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
