import { requireAdminUser } from "@/lib/admin-auth";
import {
  PropertiesTable,
  type AdminPropertyRow,
} from "@/components/admin/PropertiesTable";

export const dynamic = "force-dynamic";

export default async function AdminPropertiesPage() {
  const { supabase } = await requireAdminUser();

  const [{ data: propertiesData }, { data: imagesData }, { data: ownersData }] =
    await Promise.all([
      supabase
        .from("properties")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
        .from("property_images")
        .select("property_id, url, position")
        .order("position", { ascending: true }),
      supabase.from("owners").select("id, name"),
    ]);

  const ownerMap = new Map<string, string>();
  for (const owner of ownersData ?? []) {
    ownerMap.set(owner.id, owner.name);
  }

  const imagesByProperty = new Map<string, string[]>();
  for (const img of imagesData ?? []) {
    const list = imagesByProperty.get(img.property_id) ?? [];
    list.push(img.url);
    imagesByProperty.set(img.property_id, list);
  }

  const rows: AdminPropertyRow[] = (propertiesData ?? []).map((property) => {
    const imgs = imagesByProperty.get(property.id) ?? [];
    return {
      ...property,
      coverUrl: imgs[0] ?? null,
      imageCount: imgs.length,
      ownerName: property.owner_id
        ? (ownerMap.get(property.owner_id) ?? null)
        : null,
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

      <PropertiesTable properties={rows} />
    </div>
  );
}
