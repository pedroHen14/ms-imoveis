import { requireAdminUser } from "@/lib/admin-auth";
import {
  getSearchParam,
  parsePageParam,
  sanitizePostgrestSearch,
  type RawSearchParams,
} from "@/lib/admin-pagination";
import {
  PropertiesTable,
  type AdminPropertyRow,
} from "@/components/admin/PropertiesTable";
import type { PropertyPurpose, PropertyStatus } from "@/types/database";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

const VALID_STATUSES = new Set<PropertyStatus>([
  "disponivel",
  "reservado",
  "vendido",
  "alugado",
  "rascunho",
]);

const VALID_PURPOSES = new Set<PropertyPurpose>(["venda", "locacao"]);

const ADMIN_PROPERTY_LIST_SELECT =
  "id, code, slug, title, type, purpose, price, condominium, neighborhood, city, status, is_featured, owner_id, created_at, owners ( name )";

interface AdminPropertiesPageProps {
  searchParams: Promise<RawSearchParams>;
}

function extractOwnerName(
  relation: { name: string } | { name: string }[] | null | undefined,
): string | null {
  if (!relation) return null;
  if (Array.isArray(relation)) {
    return relation[0]?.name ?? null;
  }
  return relation.name ?? null;
}

export default async function AdminPropertiesPage({
  searchParams,
}: AdminPropertiesPageProps) {
  const { supabase } = await requireAdminUser();
  const rawParams = await searchParams;

  const queryText = getSearchParam(rawParams.q).slice(0, 80);
  const cleanedQuery = sanitizePostgrestSearch(queryText);

  const rawStatus = getSearchParam(rawParams.status);
  const statusFilter: "all" | PropertyStatus = VALID_STATUSES.has(
    rawStatus as PropertyStatus,
  )
    ? (rawStatus as PropertyStatus)
    : "all";

  const rawPurpose = getSearchParam(rawParams.purpose);
  const purposeFilter: "all" | PropertyPurpose = VALID_PURPOSES.has(
    rawPurpose as PropertyPurpose,
  )
    ? (rawPurpose as PropertyPurpose)
    : "all";

  const page = parsePageParam(rawParams.page);
  const hasFilters = Boolean(
    cleanedQuery || statusFilter !== "all" || purposeFilter !== "all",
  );

  // Permite localizar imóveis também pelo nome do proprietário vinculado
  let matchingOwnerIds: string[] = [];
  if (cleanedQuery) {
    const { data: matchedOwners } = await supabase
      .from("owners")
      .select("id")
      .ilike("name", `%${cleanedQuery}%`)
      .limit(50);

    matchingOwnerIds = (matchedOwners ?? []).map((owner) => owner.id);
  }

  let propertiesQuery = supabase
    .from("properties")
    .select(ADMIN_PROPERTY_LIST_SELECT, { count: "exact" });

  if (statusFilter !== "all") {
    propertiesQuery = propertiesQuery.eq("status", statusFilter);
  }

  if (purposeFilter !== "all") {
    propertiesQuery = propertiesQuery.eq("purpose", purposeFilter);
  }

  if (cleanedQuery) {
    const orParts = [
      `title.ilike.%${cleanedQuery}%`,
      `condominium.ilike.%${cleanedQuery}%`,
      `neighborhood.ilike.%${cleanedQuery}%`,
      `city.ilike.%${cleanedQuery}%`,
    ];

    const codeMatch = cleanedQuery.replace(/^#/, "").trim();
    if (/^\d{1,9}$/.test(codeMatch)) {
      orParts.push(`code.eq.${Number.parseInt(codeMatch, 10)}`);
    }

    if (matchingOwnerIds.length > 0) {
      orParts.push(`owner_id.in.(${matchingOwnerIds.join(",")})`);
    }

    propertiesQuery = propertiesQuery.or(orParts.join(","));
  }

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const [{ data: propertiesData, count: filteredCount }, anyPropertyResult] =
    await Promise.all([
      propertiesQuery
        .order("created_at", { ascending: false })
        .range(from, to),
      hasFilters
        ? supabase
            .from("properties")
            .select("id", { count: "exact", head: true })
        : Promise.resolve({ count: null as number | null }),
    ]);

  const propertiesList = propertiesData ?? [];
  const totalCount = filteredCount ?? propertiesList.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const hasAnyProperty = hasFilters
    ? (anyPropertyResult.count ?? totalCount) > 0
    : totalCount > 0;

  const pagePropertyIds = propertiesList.map((item) => item.id);
  const imageSummaryByProperty = new Map<
    string,
    { coverUrl: string | null; imageCount: number }
  >();

  if (pagePropertyIds.length > 0) {
    const { data: summaries, error: summaryError } = await supabase.rpc(
      "get_property_image_summaries",
      { p_property_ids: pagePropertyIds },
    );

    if (!summaryError && summaries) {
      for (const item of summaries) {
        imageSummaryByProperty.set(item.property_id, {
          coverUrl: item.cover_url,
          imageCount: item.image_count,
        });
      }
    } else {
      // Fallback seguro limitado aos 20 imóveis da página atual (nunca atinge teto de 1.000 linhas)
      const { data: imagesData } = await supabase
        .from("property_images")
        .select("property_id, url, position")
        .in("property_id", pagePropertyIds)
        .order("position", { ascending: true });

      for (const img of imagesData ?? []) {
        const current = imageSummaryByProperty.get(img.property_id);
        if (!current) {
          imageSummaryByProperty.set(img.property_id, {
            coverUrl: img.url,
            imageCount: 1,
          });
        } else {
          current.imageCount += 1;
        }
      }
    }
  }

  const rows: AdminPropertyRow[] = propertiesList.map((property) => {
    const summary = imageSummaryByProperty.get(property.id);
    return {
      id: property.id,
      code: property.code,
      slug: property.slug,
      title: property.title,
      type: property.type,
      purpose: property.purpose,
      price: property.price,
      condominium: property.condominium,
      neighborhood: property.neighborhood,
      city: property.city,
      status: property.status,
      is_featured: property.is_featured,
      owner_id: property.owner_id,
      created_at: property.created_at,
      coverUrl: summary?.coverUrl ?? null,
      imageCount: summary?.imageCount ?? 0,
      ownerName: extractOwnerName(
        property.owners as { name: string } | { name: string }[] | null,
      ),
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold text-foreground sm:text-3xl">
          Imóveis
        </h1>
        <p className="mt-1 text-sm text-muted">
          Gerencie sua carteira, altere status rapidamente, defina destaques na
          Home e organize fotos.
        </p>
      </div>

      <PropertiesTable
        properties={rows}
        hasAnyProperty={hasAnyProperty}
        pagination={{
          page,
          pageSize: PAGE_SIZE,
          totalItems: totalCount,
          totalPages,
        }}
        initialFilters={{
          q: queryText,
          status: statusFilter,
          purpose: purposeFilter,
        }}
      />
    </div>
  );
}
