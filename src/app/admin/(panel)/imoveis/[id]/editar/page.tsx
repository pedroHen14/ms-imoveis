import { notFound } from "next/navigation";
import { z } from "zod";
import { requireAdminUser } from "@/lib/admin-auth";
import { PropertyForm } from "@/components/admin/PropertyForm";

export const dynamic = "force-dynamic";

interface EditPropertyPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditPropertyPage({
  params,
}: EditPropertyPageProps) {
  const { id } = await params;
  const parsedId = z.string().uuid().safeParse(id);
  if (!parsedId.success) {
    notFound();
  }

  const { supabase } = await requireAdminUser();

  const [{ data: property }, { data: images }, { data: owners }] =
    await Promise.all([
      supabase.from("properties").select("*").eq("id", parsedId.data).single(),
      supabase
        .from("property_images")
        .select("url, position")
        .eq("property_id", parsedId.data)
        .order("position", { ascending: true }),
      supabase
        .from("owners")
        .select("id, name, phone")
        .order("name", { ascending: true }),
    ]);

  if (!property) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold text-foreground sm:text-3xl">
          Editar Imóvel #{property.code}
        </h1>
        <p className="mt-1 text-sm text-muted">{property.title}</p>
      </div>

      <PropertyForm
        property={property}
        initialImages={(images ?? []).map((img) => img.url)}
        owners={owners ?? []}
      />
    </div>
  );
}
