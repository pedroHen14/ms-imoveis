import { requireAdminUser } from "@/lib/admin-auth";
import {
  getSearchParam,
  parsePageParam,
  sanitizePostgrestSearch,
  type RawSearchParams,
} from "@/lib/admin-pagination";
import {
  OwnersManager,
  type OwnerWithCount,
} from "@/components/admin/OwnersManager";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

interface AdminOwnersPageProps {
  searchParams: Promise<RawSearchParams>;
}

export default async function AdminOwnersPage({
  searchParams,
}: AdminOwnersPageProps) {
  const { supabase } = await requireAdminUser();
  const rawParams = await searchParams;

  const queryText = getSearchParam(rawParams.q).slice(0, 80);
  const cleanedQuery = sanitizePostgrestSearch(queryText);
  const page = parsePageParam(rawParams.page);

  let ownersQuery = supabase
    .from("owners")
    .select("id, name, phone, notes, created_at", { count: "exact" });

  if (cleanedQuery) {
    const orParts = [
      `name.ilike.%${cleanedQuery}%`,
      `phone.ilike.%${cleanedQuery}%`,
      `notes.ilike.%${cleanedQuery}%`,
    ];

    const digitsOnly = cleanedQuery.replace(/\D/g, "");
    if (digitsOnly.length >= 3 && digitsOnly !== cleanedQuery) {
      orParts.push(`phone.ilike.%${digitsOnly}%`);
    }

    ownersQuery = ownersQuery.or(orParts.join(","));
  }

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const [{ data: ownersData, count: filteredCount }, anyOwnerRes] =
    await Promise.all([
      ownersQuery.order("name", { ascending: true }).range(from, to),
      cleanedQuery
        ? supabase.from("owners").select("id", { count: "exact", head: true })
        : Promise.resolve({ count: null as number | null }),
    ]);

  const pageOwners = ownersData ?? [];
  const totalItems = filteredCount ?? pageOwners.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const hasAnyOwner = cleanedQuery
    ? (anyOwnerRes.count ?? totalItems) > 0
    : totalItems > 0;

  const pageOwnerIds = pageOwners.map((owner) => owner.id);
  const countByOwner = new Map<string, number>();

  if (pageOwnerIds.length > 0) {
    const { data: countsData, error: countsError } = await supabase.rpc(
      "get_owner_property_counts",
      { p_owner_ids: pageOwnerIds },
    );

    if (!countsError && countsData) {
      for (const row of countsData) {
        countByOwner.set(row.owner_id, row.property_count);
      }
    } else {
      const { data: propertiesData } = await supabase
        .from("properties")
        .select("owner_id")
        .in("owner_id", pageOwnerIds);

      for (const row of propertiesData ?? []) {
        if (row.owner_id) {
          countByOwner.set(
            row.owner_id,
            (countByOwner.get(row.owner_id) ?? 0) + 1,
          );
        }
      }
    }
  }

  const owners: OwnerWithCount[] = pageOwners.map((owner) => ({
    ...owner,
    propertyCount: countByOwner.get(owner.id) ?? 0,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold text-foreground sm:text-3xl">
          Proprietários
        </h1>
        <p className="mt-1 text-sm text-muted">
          Cadastro privado de proprietários vinculados à sua carteira. Esses
          dados nunca são exibidos no site público.
        </p>
      </div>

      <OwnersManager
        owners={owners}
        hasAnyOwner={hasAnyOwner}
        initialQuery={queryText}
        pagination={{
          page,
          pageSize: PAGE_SIZE,
          totalItems,
          totalPages,
        }}
      />
    </div>
  );
}
