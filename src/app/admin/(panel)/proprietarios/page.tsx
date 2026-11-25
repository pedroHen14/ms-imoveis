import { requireAdminUser } from "@/lib/admin-auth";
import {
  OwnersManager,
  type OwnerWithCount,
} from "@/components/admin/OwnersManager";

export const dynamic = "force-dynamic";

export default async function AdminOwnersPage() {
  const { supabase } = await requireAdminUser();

  const [{ data: ownersData }, { data: propertiesData }] = await Promise.all([
    supabase
      .from("owners")
      .select("id, name, phone, notes, created_at")
      .order("name", { ascending: true }),
    supabase
      .from("properties")
      .select("owner_id")
      .not("owner_id", "is", null),
  ]);

  const countByOwner = new Map<string, number>();
  for (const row of propertiesData ?? []) {
    if (row.owner_id) {
      countByOwner.set(row.owner_id, (countByOwner.get(row.owner_id) ?? 0) + 1);
    }
  }

  const owners: OwnerWithCount[] = (ownersData ?? []).map((owner) => ({
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

      <OwnersManager owners={owners} />
    </div>
  );
}
